import { Button, Radio } from "antd";
import { CreditCardOutlined, QrcodeOutlined, WalletOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { money } from "../../../../shared/utils/format";

// Bước 2: xem lại người nhận, chọn đặt cọc/trả đủ và phương thức thanh toán
export default function PaymentStep({
  recipient,
  delivery,
  depositRates,
  mode,
  deposit,
  payment,
  depositDue,
  submitting,
  onModeChange,
  onPaymentChange,
  onBack,
  onSubmit,
}) {
  const { t } = useTranslation();

  return (
    <>
      <h2>{t("Kiểm tra thông tin")}</h2>
      <p>
        {recipient.name} · {recipient.phone}
      </p>
      <p>{delivery === "ship" ? recipient.address : t("Nhận tại cửa hàng")}</p>
      {recipient.note && <p>{recipient.note}</p>}
      {depositRates.length > 0 && (
        <>
          <h3>{t("Hình thức thanh toán")}</h3>
          <Radio.Group
            className="payment-amount-options"
            value={deposit ? mode : "full"}
            onChange={(e) => onModeChange(e.target.value)}
            options={[
              ...depositRates.map((percent) => ({
                value: `deposit${percent}`,
                label: t("Đặt cọc {{percent}}%", { percent }),
              })),
              { value: "full", label: t("Thanh toán toàn bộ") },
            ]}
          />
        </>
      )}
      <h3>{t("Phương thức thanh toán")}</h3>
      <Radio.Group
        className="payment-method-options"
        value={payment}
        onChange={(e) => onPaymentChange(e.target.value)}
      >
        {/* Đặt cọc phải trả trước nên không cho chọn trả khi nhận hàng */}
        <Radio value="cash" disabled={deposit}>
          <WalletOutlined />
          <span>
            <strong>{t("Khi nhận hàng")}</strong>
            <small>{t("Trả tiền khi nhận đủ sản phẩm")}</small>
          </span>
        </Radio>
        <Radio value="qr">
          <QrcodeOutlined />
          <span>
            <strong>{t("Chuyển khoản QR")}</strong>
            <small>{t("Quét mã bằng ứng dụng ngân hàng")}</small>
          </span>
        </Radio>
        <Radio value="card">
          <CreditCardOutlined />
          <span>
            <strong>{t("Thẻ")}</strong>
            <small>{t("Thanh toán qua cổng ngân hàng")}</small>
          </span>
        </Radio>
      </Radio.Group>
      {deposit && (
        <p>
          {t("Cọc dự kiến")}: <strong>{money(depositDue)}</strong>
        </p>
      )}
      <div className="buy-actions">
        <Button onClick={onBack}>{t("Quay lại")}</Button>
        <Button type="primary" onClick={onSubmit} loading={submitting}>
          {t("Xác nhận đặt hàng")}
        </Button>
      </div>
    </>
  );
}
