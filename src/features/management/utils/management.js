import { orderLabels } from "../../../shared/adapters/viewAdapters";
export const LOW_STOCK_LIMIT = 5;
export function stockStatus(stock) {
  return stock <= 0 ? "Hết hàng" : "Còn hàng";
}
export function isLowStock(stock, limit = LOW_STOCK_LIMIT) {
  return stock > 0 && stock <= limit;
}
export function filterInventory(rows, { query = "", status, min, max }) {
  return rows.filter(
    (row) =>
      `${row.product} ${row.label} ${row.color}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()) &&
      (!status || stockStatus(row.stock) === status) &&
      (min == null || row.stock >= min) &&
      (max == null || row.stock <= max),
  );
}
export function todayRevenue(orders, now = new Date()) {
  const formatDay = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const today = formatDay.format(now);
  return orders.reduce((total, order) => {
    if (order.status !== "Đã hoàn thành") return total;
    const completedAt =
      order.completedAt ||
      order.history?.findLast((event) => event.text === "Đã hoàn thành")?.at ||
      order.createdAt;
    const date = new Date(completedAt);
    return !Number.isNaN(date.getTime()) && formatDay.format(date) === today
      ? total + order.total
      : total;
  }, 0);
}
export { statusFlow } from "../constants/management";
export function nextStatuses(order) {
  return (order.allowed_next_statuses || []).map(({ code }) => orderLabels[code]).filter(Boolean);
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
