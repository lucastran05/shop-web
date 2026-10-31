import { userError } from "../../../shared/utils/userError";
import { useState } from "react";
import { usePolling } from "../../../shared/hooks/usePolling";
import { Alert, Button, QRCode, Result, Tag } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CreditCardOutlined,
  QrcodeOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { money } from "../../../shared/utils/format";
import { api, ApiError } from "../../../shared/api";

export default function PaymentPanel({ order, paymentSession, onOrderUpdate }) {
  const { t } = useTranslation();
  const [session, setSession] = useState(paymentSession);
  const [error, setError] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [qrError, setQrError] = useState(false);
  async function retry() {
    setRetrying(true);
    try {
      const { data } = await api.payments.createSession(
        order.id,
        {
          method: order.payment_method,
          purpose:
            order.payment_mode === "deposit" &&
            Number(order.paid_amount) < Number(order.deposit_amount)
              ? "deposit"
              : "full",
        },
        { idempotencyKey: crypto.randomUUID() },
      );
      setSession(data);
      setQrError(false);
      setError(null);
    } catch (requestError) {
      setError(userError(requestError));
    } finally {
      setRetrying(false);
    }
  }

  const terminal = ["cancelled", "returned", "refunded"].includes(
    order.statusCode || order.status,
  );
  usePolling(
    async () => {
      const { data } = await api.payments.get(session.id);
      if ("order" in data && "expires_at" in data) {
        setSession(data);
        onOrderUpdate?.(data.order);
        setError(null);
      }
    },
    {
      enabled:
        Boolean(session?.id) &&
        !terminal &&
        order.payment_status !== "paid" &&
        ["pending", "processing"].includes(session.status),
      intervalMs: 5000,
      onError: (requestError) =>
        setError(
          requestError instanceof ApiError
            ? userError(requestError)
            : t("Không thể kiểm tra trạng thái thanh toán"),
        ),
    },
  );

  if (terminal) return null;
  if (order.payment_status === "paid")
    return (
      <Alert
        type="success"
        showIcon
        title={t("Thanh toán thành công")}
        description={t("Đơn hàng đã được thanh toán đầy đủ.")}
      />
    );
  if (order.payment_method === "cod")
    return (
      <Alert
        type="info"
        showIcon
        title={t("Thanh toán khi nhận hàng")}
        description={t("Bạn sẽ thanh toán {{amount}} khi nhận hàng.", {
          amount: money(order.remaining_amount),
        })}
      />
    );
  if (!session)
    return (
      <Alert
        type={Number(order.paid_amount) > 0 ? "info" : "error"}
        showIcon
        title={t(
          Number(order.paid_amount) > 0
            ? "Thanh toán phần còn lại"
            : "Đơn hàng đã được tạo nhưng chưa khởi tạo được thanh toán",
        )}
        description={
          <>
            {error && <p>{error}</p>}
            <Button loading={retrying} onClick={retry}>
              {t("Tiếp tục thanh toán")}
            </Button>
          </>
        }
      />
    );
  if (session.status === "succeeded")
    return (
      <Alert
        type="success"
        showIcon
        title={t("Thanh toán thành công")}
        description={t("Đã nhận {{amount}}. Còn lại {{remaining}}.", {
          amount: money(session.amount),
          remaining: money(
            session.order?.remaining_amount ??
              Math.max(
                0,
                Number(order.total_amount) - Number(order.paid_amount),
              ),
          ),
        })}
      />
    );
  if (["failed", "expired", "cancelled"].includes(session.status))
    return (
      <Result
        status="warning"
        title={t("Phiên thanh toán không còn hiệu lực")}
        subTitle={t("Vui lòng thử lại sau.")}
        extra={
          <>
            {error && <p role="alert">{error}</p>}
            <Button loading={retrying} onClick={retry}>
              {t("Tạo lại phiên thanh toán")}
            </Button>
          </>
        }
      />
    );

  return (
    <section className="payment-panel" aria-label={t("Thanh toán đơn hàng")}>
      <div className="payment-panel-heading">
        <h3>
          {session.method === "card" ? (
            <CreditCardOutlined />
          ) : (
            <QrcodeOutlined />
          )}{" "}
          {t(
            session.method === "card"
              ? "Thanh toán bằng thẻ"
              : "Chuyển khoản QR",
          )}
        </h3>
        <Tag icon={<ClockCircleOutlined />} color="gold">
          {t("Chờ thanh toán")}
        </Tag>
      </div>
      <div className="payment-instructions">
        {session.method !== "card" && (
          <div className="payment-qr">
            {qrError ? (
              <Alert
                type="warning"
                title={t("Không tải được mã QR")}
                description={t("Vui lòng tải lại trang hoặc liên hệ cửa hàng.")}
              />
            ) : session.qr_image_url ? (
              <img
                src={session.qr_image_url}
                alt={t("Mã QR thanh toán")}
                width="220"
                height="220"
                onError={() => setQrError(true)}
              />
            ) : session.qr_payload ? (
              <QRCode type="svg" value={session.qr_payload} size={220} />
            ) : null}
          </div>
        )}
        <div className="payment-transfer-details">
          <span>{t("Số tiền thanh toán")}</span>
          <strong className="payment-due">{money(session.amount)}</strong>
          <dl>
            <div>
              <dt>{t("Nội dung chuyển khoản")}</dt>
              <dd>{order.code}</dd>
            </div>
            <div>
              <dt>{t("Hạn thanh toán")}</dt>
              <dd>
                {new Date(session.expires_at).toLocaleString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                })}
              </dd>
            </div>
          </dl>
          <p>
            {t(
              session.method === "card"
                ? "Tiếp tục đến cổng thanh toán để nhập thông tin thẻ."
                : "Mở ứng dụng ngân hàng, quét mã và kiểm tra số tiền trước khi chuyển.",
            )}
          </p>
          {session.method === "card" && session.payment_url && (
            <Button
              type="primary"
              href={session.payment_url}
              target="_blank"
              rel="noreferrer"
            >
              {t("Mở trang thanh toán")}
            </Button>
          )}
          <small className="payment-auto-status">
            <CheckCircleOutlined />{" "}
            {t("Trạng thái tự cập nhật sau khi xác nhận thanh toán.")}
          </small>
        </div>
      </div>
      {error && <Alert type="error" showIcon title={error} />}
    </section>
  );
}
