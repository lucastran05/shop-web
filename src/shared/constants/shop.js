export const shopConfig = {
  name: "ABC Shop",
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
