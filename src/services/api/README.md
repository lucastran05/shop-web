# API services

Lớp client dùng **Fetch + TypeScript strict**, triển khai 69 API giao diện trong
`shop-api/docs/apis/01-*.md` đến `19-*.md`, bổ sung refresh token từ routes thật.
Webhook tích hợp được đặt riêng ngoài barrel export của frontend.
Mỗi hàm service gửi HTTP tới backend, không tạo dữ liệu cục bộ hoặc dùng localStorage cho dữ liệu nghiệp vụ,
fallback dữ liệu hoặc giả lập thành công. Response giữ nguyên envelope và metadata
(`pagination`, `filters`, `summary`, `unread_count`, `customer`).

## Cấu trúc và đối chiếu tài liệu

```text
src/services/api/
  index.ts                       # Singleton cho Vite, export services/types
  create-api.ts                  # Factory cho từng phiên đăng nhập
  http-client.ts                 # Fetch, auth, refresh, timeout, cancellation
  api-error.ts                   # Lỗi HTTP/network/protocol có kiểu
  common.types.ts                # Envelope, pagination, token, lỗi, ID
  *.service.ts                   # 19 domain, request/query/response types cùng file
  integrations/
    payment-webhook.service.ts   # SYS01, dành cho tích hợp phía server
```

| Docs | File                               | API instance          | Phương thức                                                                                    |
| ---- | ---------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------- |
| 01   | auth.service.ts                    | auth                  | register, login, logout, getProfile, updateProfile, changePassword, refresh                    |
| 02   | addresses.service.ts               | addresses             | list, create, update, delete, setDefault, provinces, wards                                     |
| 03   | products.service.ts                | products              | list, get, categories                                                                          |
| 04   | reviews.service.ts                 | reviews               | list, create, upload                                                                           |
| 05   | cart.service.ts                    | cart                  | get, add, update, remove                                                                       |
| 06   | checkout.service.ts                | checkout              | quote, createOrder                                                                             |
| 07   | payments.service.ts                | payments              | createSession, get                                                                             |
| 08   | orders.service.ts                  | orders                | list, get, cancel                                                                              |
| 09   | chat-and-notifications.service.ts  | chatAndNotifications  | openConversation, messages, sendMessage, notifications, readNotification, readAllNotifications |
| 10   | shop.service.ts                    | shop                  | get                                                                                            |
| 11   | admin-products.service.ts          | adminProducts         | list, get, create, update, delete, bulkDelete, upload                                          |
| 12   | admin-categories.service.ts        | adminCategories       | list, create, update, delete, bulkDelete                                                       |
| 13   | admin-inventory.service.ts         | adminInventory        | list, adjust, adjustments                                                                      |
| 14   | admin-orders.service.ts            | adminOrders           | list, get, update                                                                              |
| 15   | admin-payments.service.ts          | adminPayments         | confirm, refund                                                                                |
| 16   | admin-chat.service.ts              | adminChat             | list, messages, sendMessage, create                                                            |
| 17   | admin-dashboard-reports.service.ts | adminDashboardReports | dashboard, sales, downloadSales                                                                |
| 18   | admin-users.service.ts             | adminUsers            | list, create, update, delete, bulkDelete                                                       |
| 19   | admin-settings-shop.service.ts     | adminSettingsShop     | get, update                                                                                    |

## Chạy và cấu hình

Tại `shop-web`:

```powershell
npm install
Copy-Item .env.example .env.local
npm run typecheck
npm run test:api
npm run build
npm run dev
```

`VITE_API_BASE_URL` là **gốc backend**, mặc định `http://localhost:5000`, không thêm
`/api/v1` vì API public và quản trị có tiền tố riêng. Có thể thêm tiền tố reverse
proxy trước các đường dẫn này. `VITE_API_TIMEOUT_MS` mặc định 15000 ms.
Backend phải chạy và cho phép CORS từ origin frontend. Vite đọc lại env khi khởi động.
Không có secret backend/provider trong các biến `VITE_*`.

`npm run build` kiểm tra TypeScript trước khi build. Phạm vi strict là lớp API;
các component React JavaScript hiện có chưa được chuyển sang TypeScript.

## Dùng trong React hoặc TypeScript

```ts
import { api, ApiError, type ProductsQuery } from "./services/api";

await api.auth.login({ email, password });
// login lưu accessToken/refreshToken vào bộ nhớ của cùng HTTP client.
const query: ProductsQuery = {
  keyword: "bàn phím",
  in_stock: true,
  page: 1,
  limit: 12,
};
const response = await api.products.list(query);
const products = response.data;
const totalPages = response.pagination.total_pages;

try {
  await api.auth.updateProfile({ name, phone });
} catch (error: unknown) {
  if (error instanceof ApiError) {
    console.error(error.status, error.code, error.message, error.errors);
  } else {
    throw error;
  }
}
```

Các biến `email`, `password`, `name`, `phone` lấy từ form của ứng dụng.
Catalog, danh sách quản trị và dữ liệu tài khoản đọc từ backend. Danh sách rỗng
hiển thị trạng thái trống; không lấy lại dữ liệu nghiệp vụ từ localStorage.

## Xác thực và request đồng thời

- Instance dùng trong trình duyệt chỉ giữ token trong bộ nhớ; tải lại trang sẽ yêu cầu đăng nhập lại.
  Khi tải lại trang, ShopProvider kiểm tra `/me` trước khi mở các trang cần đăng nhập.
  Role hiển thị lấy từ backend; dữ liệu user cũ trong trình duyệt không cấp quyền quản trị.
  Logout, đổi mật khẩu và phiên hết hiệu lực xóa token đã lưu.
- Tạo instance khác bằng `createApi({ baseURL })` nếu khách hàng và quản trị viên
  đăng nhập đồng thời; không dùng chung token giữa hai tài khoản.
- Khi request mang access token gặp 401, client gọi
  `POST /api/v1/auth/refresh-token` với `{ refreshToken }`, lưu cặp token xoay vòng
  và gửi lại request đúng một lần. Các request đồng thời dùng chung một refresh;
  response 401 đến muộn dùng token đã xoay thay vì refresh lại token cũ.
- Lỗi refresh 400/401/403 xóa token. Lỗi mạng/500 được trả cho caller; không biến
  thành dữ liệu thành công. Refresh đang chạy không khôi phục phiên đã bị xóa.
- Logout luôn xóa token local sau khi kết thúc request. Đổi mật khẩu thành công
  xóa token để ứng dụng yêu cầu đăng nhập lại.
- Hủy request bằng `options.signal`; timeout có thể chỉnh riêng bằng `timeoutMs`.
  Không tự chuyển trang hoặc hiện toast trong tầng HTTP.

```ts
const controller = new AbortController();
const request = api.orders.list({ page: 1 }, { signal: controller.signal });
controller.abort();
await request; // reject ApiError với kind = 'aborted'
```

## Giao dịch, upload và CSV

Các hàm `checkout.createOrder`, `payments.createSession`, `adminInventory.adjust`,
`adminPayments.confirm/refund` yêu cầu `{ idempotencyKey }`. Tạo key **một lần cho
mỗi thao tác**, giữ nguyên key nếu gửi lại cùng giao dịch. Client không tự retry
khi timeout, mất kết nối hoặc 500; chỉ replay một lần sau refresh khi server trả 401.
Backend hiện chưa thực thi idempotency, nên header này chưa bảo đảm chống ghi trùng
cho tới khi backend bổ sung xử lý.

```ts
const options = { idempotencyKey: crypto.randomUUID() };
const quote = await api.checkout.quote({
  cart_item_ids: selectedCartItemIds,
  address_id: selectedAddressId,
  delivery_method: "standard",
  payment_method: "qr",
  payment_mode: "deposit",
  deposit_rate: 20,
});
const order = await api.checkout.createOrder(
  { quote_id: quote.data.quote_id },
  options,
);

const uploaded = await api.reviews.upload({
  files: selectedFiles,
  purpose: "review",
});
await api.reviews.create(productId, {
  rating: 5,
  content: reviewContent,
  image_ids: uploaded.data.map((file) => file.id),
});

const csv = await api.adminDashboardReports.downloadSales({
  year: 2026,
  group_by: "month",
});
const downloadUrl = URL.createObjectURL(csv);
// Gán downloadUrl vào href của liên kết tải CSV trong UI.
// Gọi URL.revokeObjectURL(downloadUrl) khi không còn dùng liên kết.
```

Upload gửi `FormData` với nhiều trường `files` và `purpose`. Trình duyệt tự sinh
multipart boundary. Client kiểm tra 1–3 ảnh JPEG/PNG/WebP, tối đa 2 MB mỗi ảnh.
CSV trả `Blob`; HTTP lỗi vẫn được parse thành `ApiError`, không tải nhầm JSON lỗi.
Luôn dùng số tiền và lựa chọn thanh toán server trả về; không tính lại số dư local.

## Error contract

HTTP 200/201 và các status thành công đi qua kiểm tra `response.ok`.
`ApiError.status` giữ mã lỗi HTTP 400/401/403/404/409/422/429/500 và các mã lỗi khác.
Thành công trả response gốc;
lỗi có `status`, `code`, `errors`, `details`, `payload`, `kind`. Backend thực tế có
nhiều response chỉ có `{ status: 'error', message }`, vì vậy `code/errors/details`
được khai báo optional và không tự suy diễn mã lỗi. `payload` giữ nguyên body lỗi.

`kind` gồm `http`, `network`, `timeout`, `aborted`, `protocol`, `session`.
Lỗi không có HTTP response dùng `status = 0`. Getter `isUnauthorized`,
`isForbidden`, `isValidationError`, `isServerError` hỗ trợ UI phân nhánh.
Response 204 được HTTP client hỗ trợ cho caller dùng `void`.
Envelope JSON thành công được kiểm tra ở runtime; schema domain được kiểm tra
ở compile time, không thay thế validation schema runtime của từng payload.

## Các khác biệt contract còn lại

Các điểm sau vẫn cần đối chiếu thêm khi thay đổi backend:

1. **Upload REV03/ADP07:** service gửi multipart thông qua `files` và `purpose`. Backend kiểm tra MIME/magic bytes, kích thước, lưu file thật và trả URL có thể truy cập.
2. **ADP02/04/05:** controller sản phẩm đã nhận cả `product_id` và `id` để khớp
   các route hiện có. `image_ids` khi tạo/sửa sản phẩm chưa được backend liên kết
   vào images; form quản trị gửi danh sách `images` chứa URL thật.
3. **Tỷ lệ cọc và enums:** ví dụ Markdown dùng `0.3` và `vietqr/momo`; repository
   báo giá thật trả `allowed_deposit_rates = [20, 50, 70]` cùng
   `cod/bank_transfer/qr/card`. `deposit_rate` giữ kiểu number và nguyên giá trị;
   gửi theo danh sách backend cho phép. Types trạng thái bao gồm cả
   `shipping/shipped`, `partial/partially_paid`, `none/unpaid`; không tự đổi nghĩa.
4. **Thông báo:** service luôn gửi page/limit để backend trả `data: []` đúng docs,
   thay vì envelope legacy `data.notifications`. **PAY02:** backend có thể trả
   payment session hoặc `{ payment: LegacyPayment }`; response type là union,
   caller cần phân nhánh bằng `'payment' in response.data`.
5. **SYS01:** `07-payments.md` ghi `/payments/webhook`, nhưng routes thật và
   `Danh_sach_API_ABC_Shop.md` dùng `/payments/webhooks/:provider`. Module
   `integrations/payment-webhook.service.ts` gọi route thật, nhận `order_id`,
   `amount`, `transaction_id` cùng các trường provider. Module này không được
   export qua `index.ts`; UI chỉ tạo phiên và đọc PAY02. Backend hiện chưa xác
   minh chữ ký webhook; hợp đồng/chữ ký provider chính thức chưa được chốt.
6. **Idempotency/quote:** backend chưa kiểm tra header Idempotency-Key và chưa
   từ chối quote hết hạn như mô tả. Thanh toán/hoàn tiền đang ghi nhận dữ liệu,
   chưa bảo đảm thực hiện giao dịch tại cổng thanh toán. Client không tự tuyên bố
   giao dịch đã thành công ngoài response backend.
7. **Báo cáo:** repository hiện nhóm dữ liệu theo tháng và lọc theo năm;
   `from/to/group_by/date_basis/timezone` chưa được áp dụng đầy đủ vào truy vấn
   như docs mô tả. Service vẫn gửi các query được đặc tả và giữ nguyên kết quả
   server; cần hoàn thiện truy vấn backend trước khi đối chiếu báo cáo theo ngày/quý.

## Kiểm tra

`tests/api/http-client.test.js` dùng HTTP server cục bộ dành riêng cho test để
kiểm tra serialization, status/lỗi, refresh đồng thời và race khi logout, giữ key
giao dịch, multipart, CSV, timeout, cancellation và mất kết nối.
Fixtures test không nằm trong code production. Đây là kiểm tra transport và client,
không phải xác nhận PostgreSQL, provider thanh toán hoặc backend thật đã chạy.
