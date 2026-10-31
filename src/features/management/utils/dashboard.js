import { orderStatusGroup } from "../../../shared/constants/shop.js";

const periodFormat = new Intl.DateTimeFormat("en", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
});

export function orderPeriod(value) {
  if (value == null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = periodFormat.formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === "year").value),
    month: Number(parts.find((part) => part.type === "month").value) - 1,
  };
}

export function buildDashboardData(orders, year) {
  const rows = Array.from({ length: 12 }, (_, month) => ({
    id: month,
    label: `T${month + 1}`,
    orders: 0,
    revenue: 0,
  }));
  const periodOrders = [];
  const products = new Map();
  for (const order of orders) {
    const period = orderPeriod(order.createdAt);
    if (!period || period.year !== year) continue;
    periodOrders.push(order);
    rows[period.month].orders++;
    if (order.status !== "Đã hoàn thành") continue;
    rows[period.month].revenue += Number(order.total) || 0;
    for (const item of order.items || []) {
      const quantity = Number(item.quantity) || 0;
      if (quantity <= 0) continue;
      const key = item.id || item.name;
      const product = products.get(key) || {
        id: key,
        name: item.name,
        image: item.image,
        quantity: 0,
      };
      product.quantity += quantity;
      products.set(key, product);
    }
  }
  return {
    rows,
    orders: periodOrders,
    topProducts: [...products.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5),
  };
}

const statusColors = {
  "Chờ thanh toán": "#ed8936",
  "Chờ xác nhận": "#e6a23c",
  "Đang chuẩn bị hàng": "#36a3a8",
  "Đang giao hàng": "#4b87d5",
  "Đã hoàn thành": "#468432",
  "Đã hủy": "#b7bdc5",
  "Hoàn hàng / Hoàn tiền": "#9b78bc",
};
export function orderBreakdown(orders) {
  const counts = new Map();
  for (const order of orders) {
    const status = orderStatusGroup(order.status);
    counts.set(status, (counts.get(status) || 0) + 1);
  }
  return [...counts].map(([status, count]) => ({
    status,
    count,
    percentage: (count / orders.length) * 100,
    color: statusColors[status] || "#737373",
  }));
}
