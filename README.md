# Hướng Dẫn Cấu Trúc Dự Án Frontend (shop-web)

Dự án Frontend website bán hàng trực tuyến xây dựng trên nền tảng **React (JavaScript)** sử dụng **Vite**, tích hợp thư viện giao diện **Ant Design (antd)**.

---

## 1. Công Nghệ Sử Dụng (Tech Stack)

- **Build Tool:** [Vite](https://vite.dev/)
- **UI Framework:** [React 19+](https://react.dev/)
- **UI Component Library:** [Ant Design (antd v5)](https://ant.design/)
- **Icon Library:** [@ant-design/icons](https://ant.design/components/icon)
- **Routing:** [react-router-dom](https://reactrouter.com/)

---

## 2. Cấu Trúc Xương Sống Dự Án

Cấu trúc chỉ bao gồm các thư mục lớn cấp 1 trong `src/`, không tạo sẵn các thư mục con để nhóm tự do phát triển theo nhu cầu:

```text
shop-web/
├── public/                 # Tệp tĩnh công khai không qua bundling (favicon, logo, icons,...)
├── src/
│   ├── assets/             # Lưu trữ hình ảnh, icons, media, fonts dùng trong code
│   ├── components/         # Các UI component tái sử dụng (Button, Header, Card, Modal,...)
│   ├── constants/          # Các hằng số (Route paths, Storage keys, API endpoints,...)
│   ├── context/            # Quản lý Global State bằng React Context (AuthContext, CartContext,...)
│   ├── hooks/              # Custom React Hooks tự định nghĩa (useAuth, useCart,...)
│   ├── layouts/            # Các khung bố cục tổng thể (MainLayout, AuthLayout,...)
│   ├── pages/              # Các màn hình/trang của ứng dụng (Home, Products, Cart, Login,...)
│   ├── routes/             # Cấu hình danh sách Route điều hướng và bảo vệ trang
│   ├── services/           # Tầng kết nối và gửi yêu cầu API đến Backend (axios/fetch)
│   ├── styles/             # Cấu hình Ant Design theme tokens và CSS toàn cục
│   │   ├── theme.js        # File cấu hình màu sắc nhận diện và tokens của Ant Design
│   │   └── global.css      # Reset CSS và CSS dùng chung toàn website
│   ├── utils/              # Các hàm tiện ích (format tiền tệ VND, ngày tháng, validate,...)
│   ├── App.jsx             # Component gốc bọc Ant Design ConfigProvider
│   └── main.jsx            # Điểm khởi chạy của React App
├── index.html              # Template HTML gốc
├── package.json            # Danh sách dependencies và scripts
└── vite.config.js          # File cấu hình Vite
```

---

## 3. Bảng Chi Tiết Nhiệm Vụ Từng Thư Mục Lớn

| Thư mục | Chức năng lưu trữ & Nhiệm vụ |
| :--- | :--- |
| `src/assets/` | Lưu trữ tài nguyên tĩnh như ảnh banner, hình ảnh minh họa, icon svg nội bộ import vào component. |
| `src/components/` | Chứa các component giao diện tái sử dụng nhiều lần trong dự án (ví dụ: ProductCard, CustomButton, Navbar,...). |
| `src/constants/` | Nơi tập trung toàn bộ các giá trị hằng số cố định, mã lỗi, endpoint API, route URL,... tránh viết chuỗi cứng trong code. |
| `src/context/` | Chứa các React Context để chia sẻ dữ liệu toàn cục giữa các trang (ví dụ: thông tin user đăng nhập, giỏ hàng,...). |
| `src/hooks/` | Lưu trữ các custom hook đóng gói logic xử lý state để dùng lại ở nhiều nơi. |
| `src/layouts/` | Chứa khung bố cục trang web (ví dụ: Header + Sidebar + Content + Footer). |
| `src/pages/` | Chứa các trang giao diện tương ứng với các màn hình của website (Home, ProductDetail, Cart, Checkout, Login,...). |
| `src/routes/` | Chứa cấu hình điều hướng (routing) của ứng dụng bằng `react-router-dom`. |
| `src/services/` | Chứa các file hàm gọi API (HTTP requests) giao tiếp với Backend server. |
| `src/styles/` | Quản lý màu sắc thương hiệu của Ant Design (`theme.js`) và các file CSS toàn cục (`global.css`). |
| `src/utils/` | Chứa các hàm tiện ích tính toán, format dữ liệu (format tiền tệ VND, định dạng ngày tháng, lưu trữ localStorage,...). |

---

## 4. Tùy Chỉnh Màu Sắc Ant Design

Màu sắc thương hiệu của website được cấu hình tập trung tại:
👉 **[src/styles/theme.js](file:///c:/Users/lucas-tran/Documents/Subjects/Year4/HK1-LTW/BTL/shop-web/src/styles/theme.js)**

```javascript
export const antThemeConfig = {
  token: {
    colorPrimary: '#1677ff',       // Đổi mã HEX màu chủ đạo ở đây
    colorSuccess: '#52c41a',       // Màu thành công
    colorWarning: '#faad14',       // Màu cảnh báo
    colorError: '#ff4d4f',         // Màu báo lỗi
    borderRadius: 8,               // Bo góc viền mặc định cho Button, Card, Input
    fontSize: 14,                  // Cỡ chữ chuẩn
    fontFamily: `'Inter', sans-serif`,
  },
};
```

Toàn bộ các component của Ant Design trong ứng dụng sẽ tự động kế thừa và hiển thị đúng theo màu sắc đã cấu hình trong file này.

---

## 5. Hướng Dẫn Chạy Dự Án

Di chuyển vào thư mục dự án:
```bash
cd shop-web
```

Cài đặt thư viện:
```bash
npm install
```

Khởi chạy môi trường phát triển (Dev):
```bash
npm run dev
```

Biên dịch dự án (Build):
```bash
npm run build
```
