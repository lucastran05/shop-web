import { Button, Divider, Input, InputNumber, Select } from "antd";
import { useTranslation } from "react-i18next";
import { money } from "../../../../shared/utils/format";

function voucherLabel(voucher) {
  if (voucher.discount_type === "percentage") return `${voucher.code} — Giảm ${voucher.discount_value}%`;
  if (voucher.discount_type === "fixed") return `${voucher.code} — Giảm ${money(voucher.discount_value)}`;
  return `${voucher.code} — Miễn phí vận chuyển`;
}

// Có voucher đang hoạt động thì cho chọn từ danh sách, không có thì cho nhập mã tay
function VoucherInput({ vouchers, code, checking, onSelect, onType, onApply }) {
  const { t } = useTranslation();
  if (vouchers.length > 0)
    return (
      <Select
        aria-label={t("Voucher đang hoạt động")}
        showSearch
        allowClear
        style={{ width: "100%", marginBottom: 8 }}
        placeholder={t("Chọn voucher đang hoạt động")}
        value={code || undefined}
        optionFilterProp="label"
        options={vouchers.map((voucher) => ({ value: voucher.code, label: voucherLabel(voucher) }))}
        onChange={(value) => onSelect(value || "")}
      />
    );
  return (
    <div className="coupon">
      <Input
        aria-label={t("Mã giảm giá")}
        placeholder={t("Nhập mã giảm giá")}
        value={code}
        onChange={(e) => onType(e.target.value)}
      />
      <Button onClick={onApply} loading={checking}>
        {t("Áp dụng")}
      </Button>
    </div>
  );
}

// Cột tóm tắt: sản phẩm, voucher (chỉ sửa được ở bước 1) và tổng tiền
export default function CheckoutSummary({ step, items, totals, onQuantityChange, voucher }) {
  const { t } = useTranslation();
  const { subtotal, shipping, off, total, due } = totals;
  const editable = step === 0;

  return (
    <aside className="panel summary">
      <h2>{t("Đơn hàng của bạn")}</h2>
      {editable &&
        items.map((item) => (
          <div className="mini-product" key={item.key}>
            <img src={item.image} alt="" />
            <div>
              <span className="product-name">{item.name}</span>
              <small>
                {t(item.color)} / {t(item.variantLabel)}
              </small>
              <small>
                {t("Đơn giá")}: {money(item.price)}
              </small>
              <InputNumber
                aria-label={t("Số lượng {{name}}", { name: item.name })}
                precision={0}
                min={1}
                max={item.stock}
                value={item.quantity}
                disabled={!item.stock}
                onChange={(value) => onQuantityChange(item.key, value, item.stock)}
              />
            </div>
            <b>{money(item.price * item.quantity)}</b>
          </div>
        ))}
      {editable && <VoucherInput {...voucher} />}
      <p>
        <span>{t("Tổng tiền hàng")}</span>
        <b>{money(subtotal)}</b>
      </p>
      <p>
        <span>{t("Giảm giá")}</span>
        <b>−{money(off)}</b>
      </p>
      <p>
        <span>{t("Phí giao hàng")}</span>
        <b>{money(shipping)}</b>
      </p>
      <Divider style={{ margin: "22px 0" }} />
      <p className="total">
        <span>{t("Tổng cộng")}</span>
        <b>{money(total)}</b>
      </p>
      {step === 1 && (
        <>
          <p>
            <span>{t("Thanh toán ngay")}</span>
            <b>{money(due)}</b>
          </p>
          {total > due && (
            <p>
              <span>{t("Thanh toán khi nhận hàng")}</span>
              <b>{money(total - due)}</b>
            </p>
          )}
        </>
      )}
    </aside>
  );
}
