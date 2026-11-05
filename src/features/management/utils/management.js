import { orderLabels } from "../../../shared/adapters/viewAdapters";
import {
  canAdminConfirm,
  canCancelOrder,
} from "../../../shared/constants/shop";
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
  return (order.allowed_next_statuses || [])
    .map(({ code }) => orderLabels[code])
    .filter(Boolean);
}
export function transitionOrder(order, status, shipment = {}) {
  const allowed = nextStatuses(order);
  const isCancel = status === "Đã hủy";

  if (isCancel && canCancelOrder(order)) {
    // Cho phép hủy ở các giai đoạn: Chờ xác nhận, Đã xác nhận, Đang chuẩn bị hàng, Đã đóng gói
  } else if (!allowed.includes(status)) {
    throw new Error("Không thể chuyển sang trạng thái này.");
  }

  if (status === "Đã xác nhận" && !canAdminConfirm(order)) {
    throw new Error(
      "Đơn hàng chưa thanh toán. Phải thanh toán xong mới được xác nhận.",
    );
  }

  if (
    status === "Đang giao hàng" &&
    (!shipment.tracking?.trim() || !shipment.carrier?.trim())
  )
    throw new Error("Vui lòng nhập đơn vị vận chuyển và mã vận đơn.");
  if (
    status === "Đã hoàn thành" &&
    Number(order.paid || 0) < Number(order.total)
  )
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
