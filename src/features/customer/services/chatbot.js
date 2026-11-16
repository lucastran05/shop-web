// FAQ assistant: no customer messages are sent to staff or external providers.
export function chatbotReply(message, shop = {}) {
  const text = message
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase();
  if (/doi tra|hoan tien|bao hanh|khieu nai/.test(text))
    return "Bạn hãy chọn ‘Chat với shop’ và cung cấp mã đơn để nhân viên kiểm tra điều kiện đổi trả, hoàn tiền hoặc bảo hành. Mình không tự xác nhận các chính sách này.";
  if (/van chuyen|phi ship|giao hang|mien phi ship/.test(text))
    return "Phí vận chuyển và tổng tiền được hiển thị ở bước thanh toán sau khi bạn chọn địa chỉ và hình thức nhận hàng. Hãy kiểm tra tại đó trước khi đặt đơn. Nếu cần hỏi thời gian giao cụ thể, bạn có thể chat với shop.";
  if (/don hang|ma don|theo doi|huy don/.test(text))
    return "Đăng nhập, mở ‘Đơn mua’ rồi chọn đơn cần xem để kiểm tra trạng thái và chi tiết. Nếu cần hủy hoặc xử lý vấn đề của đơn, hãy dùng thao tác có sẵn trong chi tiết đơn hoặc liên hệ shop kèm mã đơn. Mình không truy cập hay thay đổi đơn hàng của bạn.";
  if (/lien he|dia chi|dien thoai|hotline|email/.test(text)) {
    const contact = shop.contact || {};
    const details = [
      contact.phone && `Điện thoại: ${contact.phone}`,
      contact.email && `Email: ${contact.email}`,
      contact.address && `Địa chỉ: ${contact.address}`,
    ].filter(Boolean);
    return details.length
      ? details.join("\n")
      : "Bạn có thể mở trang ‘Thông tin’ hoặc chọn ‘Chat với shop’ để liên hệ nhân viên cửa hàng.";
  }
  if (/thanh toan|chuyen khoan|tien mat|dat coc/.test(text))
    return "Ở bước thanh toán, chọn một phương thức đang được cửa hàng cung cấp và làm theo hướng dẫn hiển thị. Kiểm tra số tiền, mã đơn và thông tin nhận tiền trước khi xác nhận. Chatbot không xác nhận giao dịch thanh toán.";
  if (/mua hang|dat hang|san pham|gio hang|gia/.test(text))
    return "Mở ‘Sản phẩm’, chọn sản phẩm và phân loại phù hợp, thêm vào giỏ hàng, sau đó đăng nhập và tiến hành thanh toán. Giá và tình trạng hàng được hiển thị trên trang sản phẩm; mình không tự báo giá hoặc cam kết tồn kho.";
  if (/xin chao|hello|^hi\b|cam on/.test(text))
    return `Xin chào! Mình là chatbot của ${shop.name || "cửa hàng"}. Bạn muốn hỏi cách mua hàng, theo dõi đơn, thanh toán hay thông tin liên hệ?`;
  return "Mình hiện hỗ trợ các câu hỏi thường gặp về mua hàng, đơn hàng, thanh toán và liên hệ. Bạn có thể chọn câu hỏi gợi ý bên dưới hoặc chuyển sang ‘Chat với shop’ để được nhân viên hỗ trợ cụ thể.";
}
