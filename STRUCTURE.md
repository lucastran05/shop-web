# Cấu trúc frontend

## Các phần chính

- `src/main.jsx`: mount React, import CSS nền và `app/App.jsx`.
- `src/app`: providers toàn ứng dụng, router gốc và theme/CSS chung. `app/routes/AppRoutes.jsx` lazy-load routes customer và management.
- `src/features/customer`: pages, components, CustomerLayout và routes cho catalog, sản phẩm, giỏ, checkout, đơn, tài khoản và thông tin shop.
- `src/features/management`: pages, components, ManagementLayout, state/context, hooks, constants, utility quản trị và stylesheet riêng.
- `src/shared/api`: HTTP client TypeScript, session/token store, service của từng API. Đây là nơi duy nhất định nghĩa request và kiểu response.
- `src/shared/adapters`: chuyển response API sang dữ liệu giao diện, không phát sinh dữ liệu giả.
- `src/shared/shop`: state phiên đăng nhập và dữ liệu shop được cả customer/management dùng.
- `src/shared/preferences`, `src/shared/i18n`: tùy chọn ngôn ngữ/múi giờ và bản dịch.
- `src/shared/components`, `hooks`, `constants`, `utils`: phần dùng chung giữa các chức năng.

## Quy tắc thêm code

Đặt code chỉ dùng bởi customer/management trong feature tương ứng. Chỉ đưa vào shared khi có người dùng chung. Shared không import ngược feature. Không tạo barrel file hoặc lớp service chỉ để đổi tên/chuyển tiếp.

UI gọi service trong `shared/api`, không gọi MinIO trực tiếp. Component product upload nằm trong `features/management/components/ProductImageInput.jsx`. Không đặt key/secret MinIO trong biến `VITE_*`.

`tsconfig.json` kiểm tra `src/shared/api/**/*.ts`. Build Vite kiểm tra việc resolve import của toàn bộ JSX; các trang JSX chưa chuyển sang TypeScript. Lint kiểm tra toàn source.

## Các đường dẫn đã chuyển

| Trước | Sau |
|---|---|
| `src/App.jsx` | `src/app/App.jsx` |
| `src/routes/AppRoutes.jsx` | `src/app/routes/AppRoutes.jsx` |
| `src/pages/*.jsx` | `src/features/customer/pages/*.jsx` |
| `src/pages/management/*.jsx` | `src/features/management/pages/*.jsx` |
| `src/components/management/*` | `src/features/management/components/*` |
| `src/services/api/*` | `src/shared/api/*` |
| `src/services/*Adapter*.js` | `src/shared/adapters/*` |
| `src/context/ShopContext.jsx` | `src/shared/shop/ShopContext.jsx` |
| `src/context/ManagementContext.jsx` | `src/features/management/context/ManagementContext.jsx` |

Đã cập nhật mọi import khi di chuyển. URL trang và các endpoint backend không đổi. Tệp MinIO server/plugin Vite và script tải binary Windows cũ đã bỏ; Compose tại BTL quản lý object storage.
