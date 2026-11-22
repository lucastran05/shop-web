export const shopConfig = {
  name: "Blumora",
  description: "Cửa hàng trực tuyến",
  storagePrefix: "abc-shop-v1",
  contact: { address: "", phone: "", email: "", mapUrl: "", socialLinks: [] },
  commerce: {
    freeShippingFrom: 500000,
    shippingFee: 30000,
    depositRate: 0.2,
    coupon: { code: "ABC10", rate: 0.1, maxDiscount: 100000 },
  },
};
export const orderStatuses = [
  "Chờ thanh toán",
  "Chờ xác nhận",
  "Đang chuẩn bị hàng",
  "Đang giao hàng",
  "Đã hoàn thành",
  "Đã hủy",
  "Hoàn hàng / Hoàn tiền",
];

const orderStatusGroups = {
  "Đã xác nhận": "Đang chuẩn bị hàng",
  "Đã cọc": "Đang chuẩn bị hàng",
  "Đã đóng gói": "Đang chuẩn bị hàng",
  "Giao thành công": "Đã hoàn thành",
  "Hoàn hàng": "Hoàn hàng / Hoàn tiền",
  "Hoàn tiền": "Hoàn hàng / Hoàn tiền",
};

export function orderStatusGroup(status) {
  return orderStatusGroups[status] || status;
}

export function isAwaitingPayment(order) {
  if (!order || order.paymentStatus === "refunded") return false;
  return (
    ["pending", "Chờ xác nhận", "Chờ thanh toán"].includes(
      order.statusCode || order.status,
    ) && !canAdminConfirm(order)
  );
}

export function canAdminConfirm(order) {
  if (!order) return false;
  if (
    order.payment === "cash" ||
    order.payment === "cod" ||
    order.delivery === "pickup"
  )
    return true;
  if (Number(order.deposit) > 0) {
    return (
      order.depositStatus === "paid" ||
      order.depositStatus === "Đã xác nhận" ||
      Number(order.paid || 0) >= Number(order.deposit || 0)
    );
  }
  return (
    order.paymentStatus === "paid" ||
    Number(order.paid || 0) >= Number(order.total || 0)
  );
}

export function canCancelOrder(order) {
  if (!order) return false;
  const terminal = [
    "cancelled",
    "returned",
    "refunded",
    "Đã hủy",
    "Hoàn hàng",
    "Hoàn tiền",
  ].includes(order.statusCode || order.status);
  if (terminal) return false;
  if (
    order.shippedAt ||
    order.history?.some(
      (e) => e.status === "shipping" || e.status === "shipped",
    )
  ) {
    return false;
  }
  const cancellableCodes = ["pending", "confirmed", "processing", "packed"];
  const cancellableLabels = [
    "Chờ xác nhận",
    "Đã xác nhận",
    "Đã cọc",
    "Đang chuẩn bị hàng",
    "Đã đóng gói",
  ];
  return (
    cancellableCodes.includes(order.statusCode) ||
    cancellableLabels.includes(order.status) ||
    isAwaitingPayment(order)
  );
}
