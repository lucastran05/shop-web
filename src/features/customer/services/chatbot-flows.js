export const normalize = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
export const money = (value) => Number(value).toLocaleString("vi-VN") + " đ";

export function parseMeasure(text, unit, max) {
  const match = text
    .trim()
    .match(new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(?:${unit})?$`, "i"));
  const value = match ? Number(match[1].replace(",", ".")) : NaN;
  return Number.isFinite(value) && value > 0 && value <= max ? value : null;
}

export function estimateShipping(distance, weight) {
  if (
    !Number.isFinite(distance) ||
    distance <= 0 ||
    distance > 3000 ||
    !Number.isFinite(weight) ||
    weight <= 0 ||
    weight > 100
  )
    throw new Error("Thông số vận chuyển không hợp lệ");
  // Illustrative estimate only; does not override checkout pricing.
  const distanceFee = Math.ceil(Math.max(0, distance - 5)) * 1000;
  const weightFee = Math.ceil(Math.max(0, weight - 1)) * 5000;
  return {
    base: 20000,
    distanceFee,
    weightFee,
    total: 20000 + distanceFee + weightFee,
  };
}

export function formatOrder(order) {
  const payments = {
    unpaid: "Chưa thanh toán",
    partial: "Thanh toán một phần",
    partially_paid: "Thanh toán một phần",
    paid: "Đã thanh toán",
    refunded: "Đã hoàn tiền",
  };
  return [
    `Đơn hàng: ${order.code}`,
    `Trạng thái: ${order.status_label || order.status}`,
    `Thanh toán: ${payments[order.payment_status] || order.payment_status}`,
    `Ngày đặt: ${new Date(order.created_at).toLocaleString("vi-VN")}`,
    ...(order.items || []).map(
      (item) =>
        `• ${item.product_name}${item.variant_label ? ` (${item.variant_label})` : ""} × ${item.quantity}`,
    ),
    `Phí giao hàng: ${money(order.shipping_fee)}`,
    `Tổng tiền: ${money(order.total_amount)}`,
    ...(order.shipment?.tracking_number
      ? [`Mã vận đơn: ${order.shipment.tracking_number}`]
      : []),
  ].join("\n");
}

export function formatPromotions(vouchers) {
  if (!vouchers.length)
    return "Hiện chưa có ưu đãi còn hiệu lực dành cho bạn. Hãy quay lại sau nhé!";
  return (
    "Ưu đãi hiện tại (điều kiện được kiểm tra lại khi thanh toán):\n\n" +
    vouchers
      .map((v) =>
        [
          `${v.code} — ${v.name}`,
          v.discount_type === "free_shipping"
            ? "Miễn phí vận chuyển"
            : v.discount_type === "percentage"
              ? `Giảm ${v.discount_value}%`
              : `Giảm ${money(v.discount_value)}`,
          `Đơn tối thiểu: ${money(v.min_order_amount)}`,
          ...(v.max_discount_amount != null
            ? [`Giảm tối đa: ${money(v.max_discount_amount)}`]
            : []),
          v.expires_at
            ? `Hết hạn: ${new Date(v.expires_at).toLocaleString("vi-VN")}`
            : "Chưa đặt ngày hết hạn",
          ...(v.remaining_count != null
            ? [`Còn ${v.remaining_count} lượt sử dụng`]
            : []),
        ].join("\n"),
      )
      .join("\n\n")
  );
}
