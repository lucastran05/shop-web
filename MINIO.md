# MinIO local cho ảnh sản phẩm

Chạy trong thư mục `shop-web`. MinIO chạy trực tiếp trên Windows, độc lập với Docker backend.

```powershell
npm.cmd run minio:start
npm.cmd run dev
```

- Console: http://localhost:9001
- Tài khoản: `shopadmin`; mật khẩu nằm trong `.minio/credentials.json`.
- Dừng: `npm.cmd run minio:stop`.
- Xem trạng thái: `npm.cmd run minio:status`.
- Cài lần đầu nếu chưa có `.minio/bin/minio.exe`: `npm.cmd run minio:install`. Script dùng Go có sẵn từ 1.24 hoặc tải Go portable; cache build tạm được dọn sau khi hoàn tất.

## Tải ảnh sản phẩm

Vào **Quản lý → Sản phẩm → Sửa → Tải ảnh từ máy tính**, chọn JPG/PNG/WebP tối đa 10 MB, chờ ảnh xem trước rồi bấm **Lưu sản phẩm**.

Frontend cần chạy để phục vụ `/api/product-images/...`. Backend lưu URL ảnh trong database; MinIO lưu tệp trong bucket riêng tư `shop-products`. Sản phẩm chưa có URL ảnh sẽ hiển thị **Chưa có ảnh sản phẩm**.

## Các file cần giữ

- `.minio/bin/minio.exe`: chương trình MinIO.
- `.minio/credentials.json`: thông tin đăng nhập, không đưa lên Git.
- `.minio/storage.json`: đường dẫn kho ảnh đã chọn. Không xóa thư mục dữ liệu được ghi trong file này.
- `.minio/server.pid`, `stdout.log`, `stderr.log`: trạng thái và log vận hành, được tạo khi chạy.

Nếu chưa có cấu hình, kho ảnh mặc định là `.minio/data`. Để chọn kho mới trên ổ còn dung lượng:

```powershell
npm.cmd run minio:stop
.\scripts\minio.ps1 start -DataDirectory "$env:LOCALAPPDATA\ABCShop\minio\data"
```

Lần sau `minio:start` tự dùng lại đường dẫn đã lưu. Đổi đường dẫn không tự di chuyển ảnh cũ.

MinIO được build từ commit `7aac2a2c5b7c882e68c1ce017d8256be2feea27f` của [kho chính thức](https://github.com/minio/minio), theo giấy phép AGPL-3.0. API ảnh hiện dành cho local, hoạt động với Vite dev/preview; hosting tĩnh chỉ có `dist` sẽ không phục vụ API này.
