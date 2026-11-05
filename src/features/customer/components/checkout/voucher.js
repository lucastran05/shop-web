// Voucher ở trang đặt hàng: xem trước số tiền giảm và nhớ mã đã chọn trong phiên trình duyệt.

export const sameCode = (a, b) => a.trim().toUpperCase() === b.trim().toUpperCase();

export const findVoucher = (vouchers, code) => vouchers.find((voucher) => sameCode(voucher.code, code));

// Ước tính giảm giá ngay trên FE để hiển thị tức thì; số chính thức vẫn do API validate trả về
export function previewVoucher(voucher, subtotal, shipping) {
  let discount = 0;
  if (voucher.discount_type === "percentage")
    discount = (subtotal * Number(voucher.discount_value)) / 100;
  else if (voucher.discount_type === "fixed") discount = Number(voucher.discount_value);
  else if (voucher.discount_type === "free_shipping") discount = shipping;
  if (voucher.max_discount_amount !== null && voucher.max_discount_amount !== undefined)
    discount = Math.min(discount, Number(voucher.max_discount_amount));
  return {
    id: voucher.id,
    code: voucher.code,
    name: voucher.name,
    discount_type: voucher.discount_type,
    discount_amount: Math.max(0, Math.min(Math.round(discount), subtotal + shipping)),
  };
}

// sessionStorage có thể bị chặn (chế độ riêng tư): khi đó chỉ bỏ qua việc ghi nhớ
export function readSavedVoucher(key) {
  try {
    return sessionStorage.getItem(key)?.trim() || "";
  } catch {
    return "";
  }
}

export function saveVoucher(key, code) {
  if (!key) return;
  try {
    sessionStorage.setItem(key, code);
  } catch {
    /* không ghi nhớ được thì thôi */
  }
}

export function forgetVoucher(key) {
  if (!key) return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* không xóa được thì thôi */
  }
}
