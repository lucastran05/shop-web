import { statusFlow } from "../constants/management";
export { statusFlow } from "../constants/management";
export function nextStatuses(order) {
  if (["Đã hủy", "Hoàn tiền"].includes(order.status)) return [];
  if (order.status === "Hoàn hàng") return order.paid > 0 ? ["Hoàn tiền"] : [];
  if (["Giao thành công", "Đã hoàn thành"].includes(order.status))
    return order.status === "Giao thành công"
      ? ["Đã hoàn thành", "Hoàn hàng"]
      : ["Hoàn hàng"];
  const index = statusFlow.indexOf(
    order.status === "Đã cọc" ? "Đã xác nhận" : order.status,
  );
  return index < 0
    ? []
    : [statusFlow[index + 1], ...(index < 4 ? ["Đã hủy"] : [])].filter(Boolean);
}
export function transitionOrder(order, status, shipment = {}) {
  if (!nextStatuses(order).includes(status))
    throw new Error("Không thể chuyển sang trạng thái này.");
  if (
    status === "Đang giao hàng" &&
    (!shipment.tracking?.trim() || !shipment.carrier?.trim())
  )
    throw new Error("Vui lòng nhập đơn vị vận chuyển và mã vận đơn.");
  if (status === "Đã hoàn thành" && order.paid < order.total)
    throw new Error("Cần xác nhận đủ thanh toán trước khi hoàn thành.");
  return {
    ...order,
    ...shipment,
    status,
    ...(status === "Hoàn tiền"
      ? { refunded: order.paid, paid: 0, remaining: 0 }
      : {}),
    history: [
      ...(order.history || []),
      { at: new Date().toISOString(), text: status },
    ],
  };
}
export function adjustStock(products, productId, variantId, delta) {
  if (!Number.isInteger(delta) || delta === 0)
    throw new Error("Số lượng điều chỉnh phải là số nguyên khác 0.");
  const product = products.find((p) => p.id === productId),
    variant = product?.variants.find((v) => v.id === variantId);
  if (!variant || variant.stock + delta < 0)
    throw new Error("Số lượng tồn kho không được âm.");
  return products.map((p) =>
    p.id !== productId
      ? p
      : {
          ...p,
          variants: p.variants.map((v) =>
            v.id !== variantId ? v : { ...v, stock: v.stock + delta },
          ),
        },
  );
}
