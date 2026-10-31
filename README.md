# ABC Shop — frontend

React + Vite + Ant Design, dùng API thật của `shop-api`. Giữ giao diện customer và manager/admin hiện có, sắp xếp source theo feature.

## Chạy cùng các service

Tại BTL, chuẩn bị `.env` theo `.env.example`, rồi:

```powershell
docker compose up -d --build --wait
```

Mở http://localhost:8080 hoặc http://localhost:8080/management/login. Compose chung tại `BTL/compose.yaml` chạy cả PostgreSQL, MinIO, API và Nginx frontend. Không còn Compose riêng trong frontend. Nginx proxy `/api`, `/admin`, `/uploads` tới API; route SPA hỗ trợ tải lại trang trực tiếp.

## Phát triển riêng frontend

```powershell
cd shop-web
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Vite chạy tại localhost:5173. `VITE_API_BASE_URL=/` dùng cùng origin; dev proxy chuyển API và ảnh tới `VITE_API_PROXY_TARGET`, mặc định http://localhost:5000. Không đặt backend/MinIO secret trong `VITE_*`.

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

Node.js 22.12+ hoặc 24. `npm.cmd` tránh lỗi execution policy của PowerShell.

## Cấu trúc source

Đọc code theo luồng: **page/component** hiển thị giao diện → hook/context giữ trạng thái → service trong `shared/api` gửi request → adapter chuyển response cho giao diện. Bắt đầu ở `src/main.jsx`, rồi xem `src/app/routes/AppRoutes.jsx` để tìm nhóm trang customer hoặc management.

```text
src/
├── app/                    # App, routing gốc, CSS/theme
├── features/
│   ├── customer/           # Pages, components, layout, routes bán hàng
│   └── management/         # Pages, state, hooks, components, routes quản trị
├── shared/
│   ├── api/                # TypeScript HTTP client, API services, session store
│   ├── adapters/           # Chuyển response thành dữ liệu giao diện
│   ├── shop/               # Context/phiên dùng chung
│   ├── preferences/        # Ngôn ngữ/múi giờ
│   ├── i18n/               # Bản dịch và cấu hình i18next
│   ├── components/         # Component dùng chung
│   ├── hooks/
│   ├── constants/
│   └── utils/
└── main.jsx
```

Hai nhóm route customer/management được lazy-load. Xem [STRUCTURE.md](STRUCTURE.md) để biết vị trí file cũ/mới và quy tắc đặt code; [API services](src/shared/api/README.md) cho hợp đồng client; [MANAGER-ADMIN.md](MANAGER-ADMIN.md) cho nghiệp vụ quản trị.

## Ảnh và MinIO

Upload qua backend có JWT, dữ liệu ảnh nằm trong bucket MinIO private. Frontend không chạy MinIO SDK hoặc server upload riêng. Xem [MINIO.md](MINIO.md) để cấu hình, địa chỉ console và giới hạn file.

Ảnh review tối đa 2 MB; product/avatar tối đa 10 MB, 1–3 file mỗi request. Tài khoản admin/manager dùng **Quản lý → Sản phẩm → Tải ảnh từ máy tính**. ProductImageInput giữ bước tối ưu kích thước ảnh trước khi upload.

Token được lưu trong localStorage để giữ phiên sau khi tải lại và mở tab mới; đăng nhập/đăng xuất được đồng bộ giữa các tab. Dữ liệu nghiệp vụ lấy từ backend, không tự tạo thành công khi request lỗi. Theme, ngôn ngữ và các URL trang hiện tại được giữ lại.
