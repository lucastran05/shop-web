# ABC Shop — giao diện Customer

Mã nguồn giao diện bán hàng tổng quát bằng **React + Vite + Ant Design**, phát triển trên khung `shop-web-main` được cung cấp. Không định hướng theo một ngành hàng. Catalog dùng tên `Sản phẩm 01...08`, `Danh mục 1...3`, hình placeholder và phân loại mẫu để có thể thay thế bằng bất kỳ dữ liệu bán hàng nào.

## 1. Chạy dự án trên Windows

Giải nén ZIP. Mở **thư mục chứa package.json** trong VS Code. Nếu bên ngoài còn một thư mục `shop-web-main`, cần mở tiếp thư mục đó.

```powershell
cd .\shop-web-main
npm.cmd install
npm.cmd run dev
```

Nếu terminal đã ở thư mục có `package.json`, bỏ qua lệnh `cd`. Mở địa chỉ Vite in trong terminal (thường là http://localhost:5173). `npm.cmd` tránh lỗi execution policy của PowerShell.

Yêu cầu Node.js 22.12+ hoặc 24. Không cần cài Vite toàn cục. Các dependency được khai báo sẵn trong package.json và khóa phiên bản trong package-lock.json.

```powershell
npm.cmd run build
npm.cmd run preview
npm.cmd run lint
npm.cmd test
```

ZIP không chứa node_modules hoặc dist. Khi hosting SPA, cấu hình fallback các đường dẫn về index.html.

## 2. Giữ khung và theme ban đầu

Các thư mục cấp 1 ban đầu trong `src/` được giữ nguyên; không thay framework, build tool hay thư viện giao diện. `src/styles/theme.js` được khôi phục nguyên bản:

- Primary và info: `#1677ff`.
- Success: `#52c41a`; warning: `#faad14`; error: `#ff4d4f`.
- Border radius: 8; font size: 14; font family theo file gốc.
- Button cao 38, radius 6, font weight 500; Card radius 10; Input cao 38, radius 6.
- Global CSS giữ nền `#f5f5f5`, chữ `#333333`, reset, scrollbar, container của bản gốc và bổ sung bố cục Customer.

```text
src/
├── assets/                     Giữ thư mục tài nguyên gốc
├── components/ProductCard.jsx   Thẻ sản phẩm tái sử dụng
├── constants/
│   ├── shop.js                  Tên shop, liên hệ, chính sách, trạng thái đơn
│   └── products.js              Dữ liệu catalog mẫu trung lập
├── context/
│   ├── shop.js                  Định nghĩa Context
│   └── ShopContext.jsx          Giỏ, hồ sơ, đơn hàng, chat, thông báo
├── hooks/
│   ├── useShop.js               Truy cập Context
│   └── useSaved.js              State được lưu localStorage
├── layouts/CustomerLayout.jsx   Header, footer, chat, thông báo
├── pages/                      Catalog, ProductDetail, Cart, Checkout,
│                               Orders, Auth, Account
├── routes/CustomerRoutes.jsx    Khai báo route Customer
├── services/productService.js   Nguồn catalog, điểm thay thế bằng API
├── styles/
│   ├── theme.js                 Theme gốc được giữ nguyên
│   └── global.css               CSS gốc + bố cục Customer responsive
├── utils/
│   ├── format.js                Định dạng tiền VND
│   └── checkout.js              Tính tiền hàng, phí ship, giảm giá, cọc
├── App.jsx                     ConfigProvider, providers, router
└── main.jsx                    Điểm khởi chạy gốc
```

`public/products/` có hình placeholder local. Thư mục `tests/` bổ sung các bài kiểm thử; các thư mục gốc được giữ nguyên.

## 3. Chức năng theo yêu cầu Customer

| Màn hình                   | Đã triển khai trong frontend                                                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header/footer              | ABC Shop, tìm kiếm, tài khoản, giỏ hàng; sau đăng nhập có thông báo và chat. Liên hệ/bản đồ/mạng xã hội hiển thị khi cấu hình dữ liệu thật.                               |
| Catalog `/`                | Tìm tên, lọc danh mục sinh từ dữ liệu, giá tối đa, còn hàng, nổi bật/ghim, sắp xếp giá, phân trang.                                                                       |
| Chi tiết `/products/:id`   | Nhiều ảnh/phóng to, mô tả, bảng thuộc tính linh hoạt, chọn phân loại có màu/giá/tồn riêng, số lượng, mua ngay/thêm giỏ.                                                   |
| Giỏ `/cart`                | Khách chưa đăng nhập vẫn dùng giỏ; thêm, sửa số lượng, xóa, chọn từng dòng hoặc tất cả, tổng tiền.                                                                        |
| Checkout `/checkout`       | Yêu cầu phiên đăng nhập; nhận hàng/địa chỉ lưu sẵn/ghi chú; ship hoặc nhận tại shop; mã giảm giá; trả toàn bộ hoặc cọc; QR/thẻ/tiền mặt.                                  |
| Đơn mua `/orders`          | Lọc mọi trạng thái trong tài liệu; xem người nhận, mặt hàng, tiền hàng, phí ship, giảm giá, cọc, số tiền đã trả/còn lại, mã vận đơn, đơn vị/ngày gửi; hủy trước xác nhận. |
| Tài khoản `/account`       | Xem/sửa thông tin, thêm/sửa/xóa địa chỉ, đặt địa chỉ mặc định; biểu mẫu đổi mật khẩu có validation.                                                                       |
| Đăng nhập/đăng ký `/login` | Hai tab, validation tên/email/mật khẩu demo, chuyển về checkout sau đăng nhập; hồ sơ đã lưu được khôi phục theo email trong demo.                                         |
| Chat/thông báo             | Gửi/lưu tin nhắn, xem thông báo và đánh dấu đã đọc; tạo/hủy đơn sinh thông báo demo.                                                                                      |

Giao diện có bố cục desktop/mobile. Không bổ sung màn hình Admin hoặc Quản lý ngoài phạm vi Customer.

## 4. Tái sử dụng cho shop khác

### Thông tin shop

Sửa `src/constants/shop.js`: `name`, `description`, `contact.address`, `phone`, `email`, `mapUrl`, `socialLinks`. Header, footer, trang chào và đăng nhập dùng tên từ cấu hình. Nếu đổi tên khi triển khai, cập nhật thêm title/description tĩnh trong index.html.

Ví dụ cấu trúc liên kết: `socialLinks: [{label: 'Facebook', url: 'https://...'}]`. Để trống nếu chưa có; không có số điện thoại, địa chỉ hoặc liên kết giả. `mapUrl` là URL Google Maps mở trong tab mới.

### Sản phẩm và phân loại

Sửa `src/constants/products.js`, hoặc thay nguồn trong `src/services/productService.js` khi có API.

```js
{
  id: 1,
  name: 'Tên sản phẩm',
  category: 'Tên danh mục',
  description: 'Mô tả sản phẩm',
  image: '/products/1.svg',
  images: ['/products/1.svg', '/products/1-detail.svg'],
  featured: true,
  deposit: true,
  attributes: [
    { label: 'Chất liệu', value: '...' },
    { label: 'Thông số', value: '...' }
  ],
  variants: [
    { id: 'standard', label: 'Tiêu chuẩn', color: 'Trắng', price: 249000, stock: 20 },
    { id: 'option-2', label: 'Tùy chọn 2', color: 'Đen', price: 299000, stock: 8 }
  ]
}
```

`variants` có ít nhất một phần tử; id sản phẩm là số duy nhất, id biến thể duy nhất trong mỗi sản phẩm. `color` có thể bỏ trống. Nếu không có phân loại, chỉ để một biến thể `Tiêu chuẩn`. Giá và tồn kho theo biến thể; giá catalog là giá thấp nhất. Danh mục sinh tự động từ dữ liệu. Thay ảnh bằng URL hoặc tài nguyên local. Mảng `attributes` dùng được cho kích thước, dung tích, chất liệu, thông số kỹ thuật… không phụ thuộc ngành hàng.

### Chính sách mẫu

Trong `shopConfig.commerce`:

- Miễn phí vận chuyển từ 500.000đ tiền hàng trước giảm; dưới ngưỡng phí 30.000đ; nhận tại shop miễn phí.
- `ABC10` giảm 10%, tối đa 100.000đ tiền hàng.
- Cọc 20% tổng đơn sau giảm + ship. Chỉ hỗ trợ khi mọi sản phẩm trong đơn đều cho cọc; cọc không dùng COD. Tỷ lệ có thể đổi trong cấu hình.
- Mua ngay thanh toán dòng biến thể đã chọn. Nếu đã có trong giỏ, số lượng được cộng và giới hạn bằng tồn kho của biến thể.

Đây là giá trị mẫu cấu hình được, không phải chính sách đã xác nhận của một shop cụ thể.

## 5. Phạm vi demo và kết nối backend

Backend `shop-api-main` được cung cấp chỉ có `/api/health`. Bản này không sửa backend và không giả rằng đã có các API nghiệp vụ.

- Xác thực: phiên demo từ email, không kiểm tra danh tính, không lưu mật khẩu; không dùng mật khẩu/dữ liệu thật. Biểu mẫu đổi mật khẩu chỉ kiểm tra dữ liệu nhập, không báo đổi thành công.
- Dữ liệu: giỏ, hồ sơ, đơn, chat và thông báo lưu trong localStorage với prefix `abc-shop-v1`. Lọc theo email chỉ phục vụ demo, không phải bảo vệ quyền truy cập.
- Thanh toán: chọn QR/thẻ/COD nhưng không tạo giao dịch hay thu thông tin thẻ. Đã trả vẫn bằng 0; cọc là số tiền dự kiến. Trạng thái thanh toán và ngày cọc chỉ cập nhật khi có backend xác nhận. Không tự động hoàn tiền.
- Đơn/vận chuyển: đơn mới chờ xác nhận; không có tác vụ giả tự giao hàng. Mã vận đơn/đơn vị/ngày gửi hiển thị nếu dữ liệu đơn có. Admin/Quản lý thực tế phải cập nhật qua backend.
- Chat: lưu nội dung demo, chưa gửi đến nhân viên thật, chưa realtime. Thông báo mới chỉ phát sinh từ thao tác tạo/hủy đơn trong demo.
- Tồn kho: giới hạn số lượng theo dữ liệu mẫu; backend cần kiểm tra tồn, giữ/trừ kho khi đặt hàng thật.

Khi triển khai thật: bổ sung service auth, cart, order, payment, user, message, notification. Backend phải tính lại giá, kiểm tra coupon/tồn/trạng thái, xác thực quyền sở hữu và xác minh webhook thanh toán. Không tin giá hoặc email từ localStorage. Route frontend bảo vệ trải nghiệm, không thay cho phân quyền backend.

Các endpoint như `/api/auth/login`, `/api/products`, `/api/cart`, `/api/orders`, `/api/me/addresses` là hướng tích hợp cần thống nhất với đội backend, chưa phải API đã có.

## 6. Kiểm thử

`npm test` chạy các bài test DOM cho luồng yêu cầu đăng nhập, đặt cọc/hủy đơn, thanh toán dòng được chọn, tìm kiếm/hết hàng, biến thể và địa chỉ nhận hàng. `npm run lint` kiểm tra mã; `npm run build` tạo production bundle.

Build có cảnh báo bundle Ant Design lớn; code splitting là bước tối ưu triển khai, không thay đổi chức năng. Chưa xác nhận trực quan bằng trình duyệt thật trong môi trường bàn giao.

## 7. Giấy phép và tái sử dụng

Mã nguồn được cung cấp theo giấy phép MIT trong `LICENSE`, cho phép sử dụng, chỉnh sửa và phân phối lại, bao gồm trong dự án thương mại, với điều kiện giữ thông báo bản quyền và giấy phép. Các dependency vẫn áp dụng giấy phép riêng của chúng.
