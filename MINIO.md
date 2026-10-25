# MinIO local

MinIO là dịch vụ lưu trữ cục bộ trên Windows, chạy độc lập với Docker backend.

```powershell
npm.cmd run minio:start
npm.cmd run minio:status
npm.cmd run minio:stop
```

- Console: `http://localhost:9001`
- Tài khoản: `shopadmin`
- Mật khẩu: đọc từ `.minio/credentials.json`; không commit file này.
- Cài lần đầu: `npm.cmd run minio:install`.

Backend hiện nhận ảnh sản phẩm qua `POST /admin/uploads` và lưu URL ảnh trong cơ sở dữ liệu. Nếu backend được cấu hình dùng MinIO, ảnh được lưu trong bucket đã cấu hình; nếu không, backend dùng thư mục upload local. Không cần sửa Docker để chạy MinIO local.

Trong giao diện, vào **Quản lý → Sản phẩm → Tải ảnh từ máy tính**. Hỗ trợ JPG, PNG và WebP, tối đa 10 MB mỗi ảnh.

Các file vận hành:

- `.minio/bin/minio.exe`: chương trình MinIO.
- `.minio/credentials.json`: thông tin đăng nhập local.
- `.minio/storage.json`: đường dẫn dữ liệu đã chọn.
- `.minio/server.pid`, `stdout.log`, `stderr.log`: file trạng thái và log khi chạy.

Không đưa credentials, log hoặc dữ liệu lưu trữ lên Git.