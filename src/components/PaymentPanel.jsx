import { useEffect, useState } from "react";
import { Alert, Button, QRCode, Result } from "antd";
import { useTranslation } from "react-i18next";
import { useShop } from "../hooks/useShop";
import { money } from "../utils/format";
import { expireOrders } from "../utils/orderLifecycle";

export default function PaymentPanel({ order }) {
  const { t } = useTranslation();
  const { setOrders } = useShop();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (order.payment === "cash")
    return (
      <Alert
        type="info"
        showIcon
        title={t("Thanh toán khi nhận hàng tại shop")}
      />
    );
  const seconds = Math.max(
    0,
    Math.ceil((Date.parse(order.paymentExpiresAt) - now) / 1000),
  );
  if (order.status === "Đã hủy" || (seconds === 0 && order.paid < order.due))
    return (
      <Result
        status="warning"
        title={t("Đơn hàng đã hủy")}
        subTitle={t(order.paymentStatus)}
      />
    );
  if (order.paid >= order.due)
    return (
      <Alert type="success" showIcon title={t("Đã xác nhận thanh toán demo")} />
    );
  function simulatePayment() {
    setOrders((old) =>
      expireOrders(old).map((o) =>
        o.id === order.id && o.status !== "Đã hủy" && o.paid < o.due
          ? {
              ...o,
              paid: o.due,
              remaining: o.total - o.due,
              paymentStatus: "Đã xác nhận thanh toán demo",
              depositStatus: o.deposit ? "Đã cọc" : o.depositStatus,
              depositAt: o.deposit ? new Date().toISOString() : null,
            }
          : o,
      ),
    );
  }
  return (
    <section className="payment-panel" aria-label={t("Thanh toán đơn hàng")}>
      <h3>
        {t(
          order.payment === "qr"
            ? "Quét mã QR (demo)"
            : "Thanh toán thẻ (demo)",
        )}
      </h3>
      <p>
        {t("Số tiền thanh toán")}: <strong>{money(order.due)}</strong>
      </p>
      {order.payment === "qr" ? (
        <QRCode
          type="svg"
          value={`DEMO-NO-PAYMENT:${order.id}:${order.due}`}
          size={220}
        />
      ) : (
        <div className="demo-card">
          <strong>DEMO CARD</strong>
          <p>•••• •••• •••• 4242</p>
          <small>{t("Thẻ thử nghiệm — không nhập thông tin thẻ thật")}</small>
        </div>
      )}
      <p role="timer">
        {t("Thời gian còn lại")}:{" "}
        <strong>
          {String(Math.floor(seconds / 60)).padStart(2, "0")}:
          {String(seconds % 60).padStart(2, "0")}
        </strong>
      </p>
      <Alert
        type="info"
        showIcon
        title={t("Đơn tự hủy sau 15 phút nếu chưa thanh toán")}
        description={t(
          "Thanh toán mô phỏng, không chuyển tiền thật. Khi đóng trình duyệt, trạng thái được cập nhật khi mở lại.",
        )}
      />
      <Button type="primary" onClick={simulatePayment}>
        {t("Mô phỏng thanh toán thành công")}
      </Button>
    </section>
  );
}
