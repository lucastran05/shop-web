import { userError } from "../utils/userError";
import { useEffect, useState } from "react";
import { Alert, QRCode, Result } from "antd";
import { useTranslation } from "react-i18next";
import { money } from "../utils/format";
import { api, ApiError } from "../services/api";

export default function PaymentPanel({ order, paymentSession }) {
  const { t } = useTranslation();
  const [session, setSession] = useState(paymentSession);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (
      !session?.id ||
      ["succeeded", "failed", "expired", "cancelled"].includes(session.status)
    )
      return;
    let active = true;
    const timer = setInterval(() => {
      api.payments
        .get(session.id)
        .then(({ data }) => {
          if (active && "order" in data && "expires_at" in data) {
            setSession(data);
            setError(null);
          }
        })
        .catch((requestError) => {
          if (active)
            setError(
              requestError instanceof ApiError
                ? userError(requestError)
                : t("Không thể kiểm tra trạng thái thanh toán"),
            );
        });
    }, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [session?.id, session?.status, t]);

  if (order.payment_method === "cod")
    return <Alert type="info" showIcon title={t("Thanh toán khi nhận hàng")} />;
  if (!session)
    return (
      <Alert
        type="error"
        showIcon
        title={t("Đơn hàng đã được tạo nhưng chưa khởi tạo được thanh toán")}
      />
    );
  if (session.status === "succeeded")
    return <Alert type="success" showIcon title={t("Thanh toán thành công")} />;
  if (["failed", "expired", "cancelled"].includes(session.status))
    return (
      <Result
        status="warning"
        title={t("Phiên thanh toán không còn hiệu lực")}
        subTitle={t("Vui lòng thử lại sau.")}
      />
    );

  return (
    <section className="payment-panel" aria-label={t("Thanh toán đơn hàng")}>
      <h3>
        {t("Thanh toán qua {{provider}}", { provider: session.provider })}
      </h3>
      <p>
        {t("Số tiền thanh toán")}: <strong>{money(session.amount)}</strong>
      </p>
      {session.qr_image_url ? (
        <img
          src={session.qr_image_url}
          alt={t("Mã QR thanh toán")}
          width="220"
          height="220"
        />
      ) : session.qr_payload ? (
        <QRCode type="svg" value={session.qr_payload} size={220} />
      ) : null}
      {session.payment_url && (
        <p>
          <a href={session.payment_url} target="_blank" rel="noreferrer">
            {t("Mở trang thanh toán")}
          </a>
        </p>
      )}
      <p>
        {t("Trạng thái")}: {t(session.status)}
      </p>
      <p>
        {t("Hạn thanh toán")}: {new Date(session.expires_at).toLocaleString()}
      </p>
      {error && <Alert type="error" showIcon title={error} />}
    </section>
  );
}
