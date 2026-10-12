export const PAYMENT_TTL = 15 * 60 * 1000;

export function deductPurchased(cart, items) {
  const quantities = new Map();
  for (const item of items)
    quantities.set(item.key, (quantities.get(item.key) || 0) + item.quantity);
  return cart
    .map((item) => ({
      ...item,
      quantity: Math.max(0, item.quantity - (quantities.get(item.key) || 0)),
    }))
    .filter((item) => item.quantity > 0);
}

export function expireOrders(orders, now = Date.now()) {
  let changed = false;
  const next = orders.map((order) => {
    if (
      !order.paymentExpiresAt ||
      order.payment === "cash" ||
      order.paid >= order.due ||
      ["Đã hủy", "Hoàn tiền", "Đã hoàn thành"].includes(order.status) ||
      Date.parse(order.paymentExpiresAt) > now
    )
      return order;
    changed = true;
    return {
      ...order,
      status: "Đã hủy",
      paymentStatus: "Hết thời gian thanh toán",
      cancelledAt: new Date(now).toISOString(),
      depositStatus: order.deposit ? "Hủy cọc" : order.depositStatus,
    };
  });
  return changed ? next : orders;
}
