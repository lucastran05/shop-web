# Manager/Admin — Huyền

Trong thư mục `shop-web`, chạy `npm ci` rồi `npm run dev`.
Mở http://localhost:5173/management (Admin và Manager dùng chung đường dẫn).

- Admin: `huyen@example.com`.
- Manager: `manager@example.com`.
- Mật khẩu thử: `123456`. Muốn đổi vai trò, đăng xuất rồi đăng nhập tài khoản còn lại.

Đã làm: bảng và popup quản lý sản phẩm, danh mục, kho, đơn hàng, thanh toán, tài khoản; chat hai cột; tổng quan và báo cáo có biểu đồ. Admin có thêm trang tài khoản. Không có trang phân quyền.

Note:

- Dữ liệu quản lý lưu localStorage, chưa tích hợp `shop-api`. Mật khẩu đặt/reset được băm trong trình duyệt, chưa có xác thực máy chủ. Không xóa, khóa hoặc hạ quyền Admin đang sử dụng.
- Kho: hết hàng = 0, còn hàng > 0; bộ lọc ở các cột. Sản phẩm/tồn kho quản lý chưa đồng bộ catalog Customer.
- Đơn hàng/Kho/Thanh toán chọn tất cả kết quả đang lọc. Xóa đơn xóa dữ liệu đơn; xóa Kho/Thanh toán chỉ ẩn dòng và có khôi phục. Hoàn tiền chỉ áp dụng đơn hủy/hoàn hàng có tiền đã thu.
- Tin nhắn: tạo theo email, trả lời nhanh; menu “…” ghim, đánh dấu đã/chưa đọc, xóa và khôi phục. Tùy chọn lưu riêng theo tài khoản quản lý; xóa giữ lịch sử Customer. Chưa có realtime.
- Cấu hình dùng chung thông tin shop với Customer. Ảnh JPG/PNG/WebP tối đa 10 MB, tải qua dịch vụ ảnh đã có của dự án; xem `MINIO.md` để chạy dịch vụ.
- Doanh thu hôm nay tính theo ngày hoàn thành (giờ Việt Nam), thiếu mốc thì dùng ngày đặt. Báo cáo chia kỳ theo ngày đặt đơn.
- Source: `pages/management`, `components/management`, `layouts`, `routes`, `context`, `hooks`, `utils`, `styles/management.css`. Kiểm thử: `tests/management.test.jsx`.
