# Bloomora Web

Frontend React/Vite/Ant Design gồm trang mua hàng, trang khám phá hoa và khu vực quản lý. Website dùng API thật từ `shop-api`; cách chạy cả hệ thống nằm ở [README thư mục gốc](../README.md).

## Chạy và kiểm tra

Khởi động API ở http://localhost:5000 trước khi chạy Vite. Trong `shop-web`:

```powershell
Copy-Item .env.example .env.local
npm.cmd install
npm.cmd run dev
```

Mở http://localhost:5173. `.env.example` đặt `VITE_API_BASE_URL=/` để request dùng cùng origin; `vite.config.js` proxy `/api`, `/admin`, `/uploads` đến `VITE_API_PROXY_TARGET`, mặc định http://localhost:5000. Docker dùng Nginx ở http://localhost:8080 với cùng các đường dẫn proxy. Chỉ đặt cấu hình công khai trong biến `VITE_*`, vì chúng được đưa vào bundle frontend.

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

`typecheck` kiểm tra lớp API TypeScript; `lint` quét source; `build` kiểm tra TypeScript rồi đóng gói Vite. Dùng `npm.cmd` trên PowerShell nếu `npm.ps1` bị execution policy chặn.

## Cấu trúc source

```text
shop-web/
├── src/
│   ├── main.jsx                    # Mount React
│   ├── app/                        # App, providers, routes gốc và CSS chung
│   ├── features/
│   │   ├── customer/               # Trang bán hàng, layout, component, route
│   │   ├── discovery/              # Trang khám phá hoa
│   │   └── management/             # Trang quản lý, context, hooks, layout, route
│   └── shared/
│       ├── api/                    # Fetch client TypeScript và service theo domain
│       ├── adapters/               # Chuyển response thành dữ liệu hiển thị
│       ├── shop/                   # State cửa hàng và phiên dùng chung
│       ├── preferences/, i18n/     # Cài đặt giao diện và bản dịch
│       └── components/, hooks/     # Thành phần và hook dùng chung
├── public/                         # Tài nguyên tĩnh
├── vite.config.js                  # Dev proxy
├── nginx.conf                      # Proxy và SPA fallback khi chạy Docker
├── Dockerfile                      # Build Vite, phục vụ bằng Nginx
└── .env.example                    # Mẫu cấu hình frontend
```

`src/app/routes/AppRoutes.jsx` lazy-load hai nhóm route. `features/customer/routes/CustomerRoutes.jsx` chứa trang catalog, chi tiết, giỏ hàng, custom bouquet, checkout, đơn hàng, tài khoản, nhận diện/khám phá hoa. `features/management/routes/ManagementRoutes.jsx` chứa dashboard, sản phẩm, danh mục, tồn kho, đơn hàng, thanh toán, vouchers, tin nhắn, người dùng và cài đặt. Trang người dùng yêu cầu vai trò `admin`; backend vẫn kiểm tra quyền cho mọi request quản trị.

## Luồng dữ liệu và chỗ cần sửa

Trang và component gọi service trong `src/shared/api/*.service.ts`; `http-client.ts` xử lý Fetch, timeout, JWT và refresh token. `session-store.ts` lưu phiên browser; `src/shared/shop/ShopContext.jsx` tải lại hồ sơ và state dùng chung. `adapters/` biến response API thành dữ liệu UI. Khi sửa một màn hình, bắt đầu từ `features/.../pages`, theo component, service API, rồi đối chiếu route backend. Chỉ đưa code vào `shared/` khi nhiều feature cùng sử dụng.

Upload ảnh gửi qua API có JWT, không gọi MinIO SDK từ browser. MinIO Console tại http://localhost:9001 khi chạy Compose; credential nằm trong `.env` gốc. Các lệnh `npm.cmd run minio:start`, `minio:status`, `minio:stop` quản lý riêng service MinIO trong Compose. Ảnh review tối đa 2 MB, product/avatar tối đa 10 MB và tối đa 3 ảnh mỗi request; backend kiểm tra lại file và quyền.
