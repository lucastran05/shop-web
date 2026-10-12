# MinIO local cho ảnh sản phẩm

## Chạy trên Windows

```powershell
npm.cmd run minio:install
npm.cmd run minio:start
npm.cmd run dev
```

- Console: http://localhost:9001
- S3 API: http://localhost:9000
- Tài khoản: `shopadmin`; mật khẩu sinh ngẫu nhiên nằm trong `.minio/credentials.json`.
- Bucket riêng tư: `shop-products`, tự tạo khi tải ảnh đầu tiên.
- Dữ liệu bền vững: `.minio/data`. Không xóa thư mục này nếu muốn giữ ảnh.
- Dừng: `npm.cmd run minio:stop`; xem trạng thái: `npm.cmd run minio:status`.
- Kiểm tra tải/đọc ảnh thật: `npm.cmd run minio:check`.

Trong quản trị → Sản phẩm → Thêm/Sửa → Tải ảnh từ máy tính: chọn JPG/PNG/WebP tối đa 10 MB. Giao diện thu nhỏ ảnh về tối đa 1200 px, chuyển WebP, gửi lên MinIO. Bấm lưu sản phẩm để lưu URL ảnh. Ảnh/URL cũ vẫn dùng được; không tự chuyển các ảnh base64 cũ sang MinIO.

## Cách kết nối

`ProductImageInput` gửi ảnh qua `POST /api/product-images`. Middleware Node trong `server/productStorage.js` kiểm tra dung lượng, định dạng, tạo tên ngẫu nhiên rồi lưu object. `GET /api/product-images/:key` đọc ảnh từ bucket, nên URL lưu trong sản phẩm không hết hạn và không phụ thuộc cổng Vite.

API hoạt động với `npm run dev` và `npm run preview`. Thông tin truy cập chỉ đọc ở phía Node; không đưa khóa MinIO vào biến `VITE_*`. `.minio` bị loại khỏi Git và bị chặn khỏi Vite file serving. Cài đặt Go portable và MinIO nằm trong `.minio`, không sửa PATH hệ thống. Các lệnh khởi động chạy nền, không tự chạy khi Windows khởi động.

Đây là tích hợp **local**: MinIO chỉ lắng nghe loopback, API tải ảnh chỉ nhận kết nối local và kiểm tra origin/header. Ứng dụng hiện có đăng nhập demo, chưa có xác thực quản trị phía máy chủ. Khi deploy thật, cần chuyển middleware sang backend có xác thực và phân quyền upload, cấu hình storage được duy trì, HTTPS và sao lưu. Chỉ xuất thư mục `dist` lên hosting tĩnh sẽ không có API ảnh này. Dữ liệu sản phẩm vẫn lưu trên trình duyệt; MinIO chỉ lưu tệp ảnh.

Ảnh tải lên nhưng chưa lưu sản phẩm hoặc đã thay thế không tự xóa, nhằm tránh xóa ảnh vẫn được nơi khác sử dụng.

## Phiên bản và nguồn

Build MinIO từ commit `7aac2a2c5b7c882e68c1ce017d8256be2feea27f` trong [kho chính thức](https://github.com/minio/minio), sử dụng Go portable đã kiểm tra SHA-256. MinIO Community đã ngừng bảo trì và phát hành dưới AGPL-3.0; cài đặt này dành cho phát triển local. SDK Node: [minio-js](https://github.com/minio/minio-js).
