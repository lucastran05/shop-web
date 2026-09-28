# Manager/Admin — Huyền

Trong thư mục `shop-web`, chạy `npm ci` rồi `npm run dev`.
Mở http://localhost:5173/management (Admin và Manager dùng chung đường dẫn).

- Admin: `huyen@example.com`.
- Manager: `manager@example.com`.
- Mật khẩu thử: `123456`. Muốn đổi vai trò, đăng xuất rồi đăng nhập tài khoản còn lại.

Đã làm: bảng và popup quản lý sản phẩm, danh mục, kho, đơn hàng, thanh toán, tài khoản, tin nhắn; tổng quan và báo cáo. Admin có thêm trang tài khoản/phân quyền.

Note:

- Chỉ frontend, lưu localStorage; chưa gọi API hoặc xác thực mật khẩu.
- Bán/hoàn thành/hủy đơn chưa tự trừ hoặc hoàn tồn kho; hiện điều chỉnh tại Kho hàng.
- Sản phẩm và tồn kho Manager chưa đồng bộ với catalog Customer.
- Đơn/tin nhắn Customer dùng chung ShopContext trong cùng ứng dụng; chưa có realtime hoặc thanh toán thật.
- Source chính: `src/management/`; route thêm ở `src/App.jsx`; test ở `tests/management.test.jsx`.