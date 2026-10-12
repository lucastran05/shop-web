# Cập nhật giỏ hàng và checkout

- Đăng ký yêu cầu nhập lại mật khẩu khớp với mật khẩu ban đầu. Xác thực vẫn là demo, không lưu mật khẩu.
- Chỉ phiên khách hàng đăng nhập được thêm/xem giỏ. Giỏ lưu riêng theo email; đăng xuất ẩn giỏ, đăng nhập lại khôi phục giỏ của tài khoản đó. Dữ liệu giỏ cũ chưa có chủ sở hữu được gắn với phiên khách hàng đầu tiên sau cập nhật.
- Địa chỉ gồm tỉnh/thành phố, phường/xã và số nhà/tên đường. Dùng chung biểu mẫu ở tài khoản và lựa chọn “Thêm địa chỉ” trong checkout. Ô địa chỉ nhận hàng trong checkout chỉ đọc; địa chỉ cũ vẫn được sử dụng.
- Danh mục có bộ lọc hai đầu khoảng giá và hai ô nhập giá.
- Bước thông tin khách hàng hiển thị sản phẩm, đơn giá và ô áp dụng mã giảm giá. Sang bước thanh toán, phần tổng kết chỉ có tổng tiền hàng, giảm giá, phí giao hàng và số tiền phải thanh toán; không hiện ô nhập mã. Thanh toán tiền mặt chỉ khả dụng khi nhận tại cửa hàng và thanh toán toàn bộ.
- Tạo đơn trừ đúng số lượng đã mua khỏi giỏ theo từng phân loại, cả khi mua ngay. Xóa dòng còn 0, giữ số lượng còn lại và các món khác. Đơn bị hủy không tự thêm hàng trở lại giỏ.
- QR/thẻ là mô phỏng, có nút mô phỏng thành công. Không nhập số thẻ thật, không chuyển tiền thật. Có thể mở lại màn thanh toán trong chi tiết đơn hàng.
- Phiên thanh toán online hết hạn sau 15 phút kể từ lúc tạo đơn. Đơn chưa thanh toán đủ số tiền cần trả trước tự hủy; đơn đã thanh toán cọc không bị hủy vì còn phần dư. Thời hạn lưu cùng đơn nên tải lại trang không kéo dài thời gian.

## Giới hạn tích hợp

Dự án chưa có backend/cổng thanh toán. Việc xác thực tài khoản, xác nhận giao dịch qua webhook và hủy đơn khi không có trình duyệt đang mở cần triển khai phía máy chủ. Hiện ứng dụng kiểm tra hạn khi đang mở và khi mở lại; quét mã demo không thực hiện thanh toán.

Danh sách 34 tỉnh/thành phố và phường/xã được lưu cục bộ từ [Province Open API v2](https://provinces.open-api.vn/) ngày 12/10/2026, không phụ thuộc mạng lúc nhập địa chỉ. Dữ liệu nằm ở `src/constants/addresses.json`; cần cập nhật khi nguồn thay đổi.

## Kiểm tra

Chạy `npm test` và `npm run build` (PowerShell có chặn script: dùng `npm.cmd`). Thiết lập test nạp tuần tự thư viện giao diện trước khi nạp các route để tránh treo module loader trên Windows.
