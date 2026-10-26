# MinIO trong BTL

MinIO chạy bằng Docker Compose chung tại BTL, không chạy server/plugin riêng trong Vite.

```powershell
# Trong BTL
docker compose up -d --build --wait

# Trong shop-web: quản lý riêng service MinIO
npm.cmd run minio:start
npm.cmd run minio:status
npm.cmd run minio:stop
```

- Console: http://localhost:9001; S3 API: http://localhost:9000.
- Tài khoản/mật khẩu: `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` trong `BTL/.env`.
- Bucket: `MINIO_BUCKET`, mặc định `shop-uploads`, private. Backend tạo tự động khi khởi động.
- Dữ liệu nằm trong volume `shop_minio_data`, tồn tại qua lần rebuild container.

Backend dùng `UPLOAD_STORAGE=minio` và MinIO SDK. Tại Docker, endpoint nội bộ là `minio:9000`; chạy backend trực tiếp thì cấu hình endpoint `localhost`, key/secret từ BTL/.env. Chọn `UPLOAD_STORAGE=local` để dùng thư mục uploads khi phát triển không có MinIO.

Upload vẫn qua `POST /admin/uploads` hoặc `POST /api/v1/uploads` có JWT. Response giữ `id`, `url`, `file_name`, `mime_type`, `size_bytes`. URL `/uploads/<UUID>.<ext>` được API stream từ MinIO rồi Nginx phục vụ cùng origin với frontend. Không cần public bucket hoặc secret trong browser.

Ảnh review tối đa 2 MB; ảnh product/avatar tối đa 10 MB; 1–3 file/request. Backend kiểm tra MIME, magic bytes, quyền và giới hạn. Frontend dùng `shared/api/reviews.service.ts` cho form multipart chung với giới hạn theo purpose.

Nếu bucket/object storage không kết nối được, xem `docker compose logs --tail 50 api minio`. API khởi động sau healthcheck của PostgreSQL và MinIO; thiếu cấu hình/bucket không tạo được sẽ không nhận upload giả thành công.

Hướng dẫn SDK: [MinIO JavaScript API chính thức](https://github.com/minio/minio-js/blob/master/docs/API.md).
