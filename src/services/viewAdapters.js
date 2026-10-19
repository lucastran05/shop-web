export const orderLabels = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  processing: "Đang chuẩn bị hàng",
  shipping: "Đang giao hàng",
  shipped: "Đang giao hàng",
  delivered: "Giao thành công",
  completed: "Đã hoàn thành",
  cancelled: "Đã hủy",
  refunded: "Hoàn tiền",
};
export function mapOrder(order, email = "") {
  return {
    ...order,
    owner: order.customer?.email || email,
    createdAt: order.created_at,
    completedAt: order.completed_at,
    statusCode: order.status,
    status: orderLabels[order.status] || order.status_label || order.status,
    total: order.total_amount,
    paid: order.paid_amount,
    remaining: order.remaining_amount,
    refunded: order.refunded_amount,
    deposit: order.deposit_amount,
    depositStatus:
      order.deposit_status === "paid"
        ? "Đã xác nhận"
        : order.deposit_status === "none"
          ? "Không đặt cọc"
          : "Chờ xác nhận",
    paymentStatus: order.payment_status,
    payment: order.payment_method,
    recipient: {
      ...order.recipient,
      address: order.recipient?.full_address || "",
    },
    carrier: order.shipment?.carrier || "",
    tracking: order.shipment?.tracking_number || "",
    items: (order.items || []).map((item, index) => ({
      ...item,
      id: item.product_id,
      key: `${order.id}-${index}`,
      name: item.product_name,
      variantId: item.variant_id,
      variantLabel: item.variant_label,
      image: item.image_url,
      price: item.unit_price,
    })),
    history: (order.history || []).map((item) => ({
      ...item,
      at: item.created_at,
      text: item.label || item.note,
    })),
  };
}
export function mapMessage(item, owner) {
  return {
    ...item,
    owner,
    text: item.content,
    at: item.created_at,
    createdAt: item.created_at,
    from: item.sender_role === "customer" ? "customer" : "shop",
  };
}
export function mapShop(shop) {
  return {
    ...shop,
    contact: {
      ...shop.contact,
      mapUrl: shop.contact?.map_url || "",
      socialLinks: shop.contact?.social_links || [],
    },
  };
}
export async function listAll(load) {
  const items = [];
  let page = 1;
  let totalPages = 1;
  do {
    const response = await load({ page, limit: 100 });
    items.push(...response.data);
    totalPages = response.pagination?.total_pages || 1;
    page++;
  } while (page <= totalPages);
  return items;
}
