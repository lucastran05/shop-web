# Cập nhật Customer

Chép nội dung thư mục shop-web vào dự án đã clone, ghi đè các file trùng. Giữ nguyên .git.
Chạy npm.cmd install --include=dev rồi npm.cmd run dev.

- Mua ngay lấy sản phẩm trực tiếp, không thêm vào giỏ. Số lượng tại checkout là bản riêng.
- Đặt đơn từ Mua ngay hoặc giỏ hàng đều giữ nguyên sản phẩm và số lượng trong giỏ, kể cả sau khi xác nhận.
- Đánh dấu tất cả đã đọc nằm dưới danh sách thông báo.
- Bong bóng chat cách nhau 10px; nút chat hình tròn.
- Múi giờ nằm trên header cạnh ngôn ngữ, bỏ khỏi tài khoản.
- Bỏ các thẻ danh mục ngay dưới banner, giữ bộ lọc danh mục bên cạnh catalog.
- Đánh giá có thể không kèm ảnh; tối đa 3 ảnh JPG/PNG/WebP, mỗi ảnh đầu vào tối đa 2 MB; nén trước khi lưu, có xem trước/xóa ảnh.
- Khách chọn cọc 50%, cọc 70%, thanh toán toàn bộ cho mọi sản phẩm. Cọc dùng QR/thẻ demo; trả toàn bộ vẫn cho phép khi nhận hàng. Chưa có giao dịch thực, số tiền đã trả vẫn bằng 0 cho đến khi được xác nhận.
- Chi tiết đơn Customer gồm bảng sản phẩm/đơn giá/số lượng/thành tiền và bảng thông tin nhận hàng, thanh toán.

Dữ liệu và ảnh vẫn lưu trên trình duyệt, chưa upload lên backend. Báo lỗi nếu không đủ dung lượng lưu ảnh.
Build và lint đạt; 20 kiểm thử đạt, gồm Manager và Customer. Ảnh được kiểm thử bằng mô phỏng giải mã/nén; chưa kiểm tra giao diện bằng trình duyệt thật.

## File thay đổi
- src/components/ProductReviews.jsx
- src/layouts/CustomerLayout.jsx
- src/pages/ProductDetailPage.jsx
- src/pages/AccountPage.jsx
- src/pages/CheckoutPage.jsx
- src/pages/CatalogPage.jsx
- src/pages/OrdersPage.jsx
- src/styles/global.css
- src/constants/translations/en.json
- src/constants/translations/vi.json
- tests/customer.test.jsx
