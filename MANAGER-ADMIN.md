# Quản lý Admin/Manager

Chạy frontend trong thư mục `shop-web`:

```powershell
npm.cmd install
npm.cmd run dev
```

Mở `http://localhost:5173/management`. Frontend gọi trực tiếp `shop-api` theo `VITE_API_BASE_URL`.

Tài khoản quản trị được xác thực bởi backend. Không dùng tài khoản, mật khẩu hoặc dữ liệu mẫu trong frontend.

Các khu vực quản lý gồm sản phẩm, danh mục, tồn kho, đơn hàng, thanh toán, tài khoản, tin nhắn, dashboard, báo cáo và cài đặt shop. Quyền truy cập được kiểm tra ở cả frontend và backend.

Ảnh sản phẩm tải qua API `/admin/uploads`. Cấu hình MinIO local chỉ cần khi môi trường của bạn sử dụng MinIO; xem `MINIO.md` để biết lệnh vận hành.

Kiểm tra mã nguồn:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run test:api
npm.cmd run test:session
```