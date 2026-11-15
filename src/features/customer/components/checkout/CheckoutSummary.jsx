import { Button, Input, Select } from "antd";
import { useTranslation } from "react-i18next";
import { money } from "../../../../shared/utils/format";
import QtyStepper from "../QtyStepper";

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
    <aside className="bt-ticket" aria-label={t("Đơn hàng của bạn")}>
      <h2>{t("Đơn hàng của bạn")}</h2>
      <div className="bt-ticket-items">
        {items.map((item) => (
          <div className="bt-mini" key={item.key}>
            <img src={item.image} alt="" />
            <div>
              <span className="product-name">{item.name}</span>
              <small>{[t(item.variantLabel), t(item.color)].filter(Boolean).join(", ")}</small>
              {editable ? (
                <QtyStepper
                  size="small"
                  label={t("Số lượng {{name}}", { name: item.name })}
                  value={item.quantity}
                  min={1}
                  max={item.stock}
                  disabled={!item.stock}
                  onChange={(value) => onQuantityChange(item.key, value, item.stock)}
                />
              ) : (
                <small>
                  {money(item.price)} × {item.quantity}
                </small>
              )}
            </div>
            <b>{money(item.price * item.quantity)}</b>
          </div>
        ))}
      </div>
      {editable && <VoucherInput {...voucher} />}
      <dl className="bt-sum">
        <div>
          <dt>{t("Tổng tiền hàng")}</dt>
          <dd>{money(subtotal)}</dd>
        </div>
        <div className={off ? "is-off" : undefined}>
          <dt>{t("Giảm giá")}</dt>
          <dd>−{money(off)}</dd>
        </div>
        <div>
          <dt>{t("Phí giao hàng")}</dt>
          <dd>{shipping ? money(shipping) : t("Miễn phí")}</dd>
        </div>
        <div className="is-total">
          <dt>{t("Tổng cộng")}</dt>
          <dd key={total}>{money(total)}</dd>
        </div>
        {step === 1 && (
          <>
            <div>
              <dt>{t("Thanh toán ngay")}</dt>
              <dd>{money(due)}</dd>
            </div>
            {total > due && (
              <div>
                <dt>{t("Thanh toán khi nhận hàng")}</dt>
                <dd>{money(total - due)}</dd>
              </div>
            )}
          </>
        )}
      </dl>
    </aside>
  );
}
