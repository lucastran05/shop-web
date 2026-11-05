import { Link } from "react-router-dom";
import { Button, Tag } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { money } from "../../../../shared/utils/format";
import CopyCode from "../../../../shared/components/CopyCode";
import PaymentPanel from "../PaymentPanel";

// Bước 3: kết quả đặt hàng và khu thanh toán của đơn vừa tạo
export default function OrderReceipt({ order, paymentSession, onOrderUpdate }) {
  const { t } = useTranslation();
  const cancelled = order.status === "cancelled";
  const paid = order.payment_status === "paid";
  const tagText = cancelled ? "Đơn hàng đã hủy" : paid ? "Đã thanh toán" : "Đặt hàng thành công";

  return (
    <section className="order-receipt panel">
      <div className="receipt-heading">
        {cancelled ? (
          <CloseCircleOutlined className="receipt-success-icon" style={{ color: "#cf1322" }} />
        ) : (
          <CheckCircleOutlined className="receipt-success-icon" />
        )}
        <div>
          <Tag color={cancelled ? "default" : paid ? "success" : "blue"}>{t(tagText)}</Tag>
          <h2>{t(cancelled ? "Đơn hàng đã hủy" : "Đơn hàng đã được tạo")}</h2>
          <p>
            {t("Mã đơn")} <CopyCode value={order.code} />
          </p>
        </div>
      </div>
      <div className="receipt-totals">
        <div>
          <span>{t("Tổng cộng")}</span>
          <strong>{money(order.total_amount)}</strong>
        </div>
        <div>
          <span>{t("Đã thanh toán")}</span>
          <strong>{money(order.paid_amount)}</strong>
        </div>
        <div>
          <span>{t("Còn phải trả")}</span>
          <strong>{money(order.remaining_amount)}</strong>
        </div>
      </div>
      <PaymentPanel
        key={paymentSession?.id || order.id}
        order={order}
        paymentSession={paymentSession}
        onOrderUpdate={onOrderUpdate}
      />
      <div className="receipt-actions">
        <Link to="/orders">
          <Button type="primary">{t("Xem đơn hàng")}</Button>
        </Link>
        <Link to="/">
          <Button>{t("Tiếp tục mua sắm")}</Button>
        </Link>
      </div>
    </section>
  );
}
