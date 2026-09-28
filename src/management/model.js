import { sampleProducts } from "../constants/products";

export const statusFlow = [
  "Chờ xác nhận",
  "Đã xác nhận",
  "Đang chuẩn bị hàng",
  "Đã đóng gói",
  "Đang giao hàng",
  "Giao thành công",
  "Đã hoàn thành",
];
export const statusColors = {
  "Chờ xác nhận": "gold",
  "Đã xác nhận": "blue",
  "Đang chuẩn bị hàng": "cyan",
  "Đã đóng gói": "purple",
  "Đang giao hàng": "blue",
  "Giao thành công": "green",
  "Đã hoàn thành": "green",
  "Đã hủy": "red",
  "Hoàn tiền": "default",
};
export const initialProducts = sampleProducts.map((p) => ({
  ...p,
  active: true,
  depositRate: 20,
}));
export function seedOrders() {
  return Array.from({ length: 12 }, (_, i) => {
    const p = initialProducts[i % initialProducts.length],
      v = p.variants[0];
    const date = new Date();
    date.setDate(date.getDate() - i * 2);
    const total = v.price * ((i % 2) + 1);
    const status = statusFlow[i % statusFlow.length];
    const paid = i % 7 >= 5 ? total : i % 3 === 0 ? Math.round(total * 0.2) : 0;
    return {
      id: `DEMO-${1024 + i}`,
      owner: `khach${i + 1}@example.com`,
      createdAt: date.toISOString(),
      recipient: {
        name: [
          "Nguyễn Minh Anh",
          "Trần Hoàng Nam",
          "Lê Thu Hà",
          "Phạm Ngọc Linh",
        ][i % 4],
        phone: "0901234567",
        address: "12 Nguyễn Trãi, Hà Nội",
      },
      items: [{ ...p, ...v, quantity: (i % 2) + 1, variantLabel: v.label }],
      total,
      paid,
      remaining: total - paid,
      deposit: Math.round(total * 0.2),
      depositStatus: paid ? "Đã xác nhận" : "Chờ xác nhận",
      payment: "bank",
      status,
      tracking: i % 7 >= 4 ? `VN${102400 + i}` : "",
      carrier: i % 7 >= 4 ? "GHN" : "",
      history: [],
    };
  });
}
export const initialUsers = [
  {
    id: "admin-demo",
    name: "Dương Thị Ngọc Huyền",
    email: "huyen@example.com",
    role: "admin",
    active: true,
  },
  {
    id: "manager-demo",
    name: "Quản lý cửa hàng",
    email: "manager@example.com",
    role: "manager",
    active: true,
  },
  {
    id: "customer-demo",
    name: "Nguyễn Minh Anh",
    email: "khach1@example.com",
    role: "customer",
    active: true,
  },
];
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
