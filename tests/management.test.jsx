import { sampleProducts } from "./fixtures/products";
const initialProducts = sampleProducts.map((product) => ({
  ...product,
  active: true,
  depositRate: 20,
}));
// @vitest-environment jsdom
import { beforeAll, afterEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import App from "../src/App";
import { webcrypto } from "node:crypto";
import { matchesPassword } from "../src/utils/password";
import {
  adjustStock,
  transitionOrder,
  todayRevenue,
  stockStatus,
  isLowStock,
  filterInventory,
} from "../src/utils/management";

test("today revenue uses completion date in Vietnam and excludes unfinished or refunded orders", () => {
  const now = new Date("2026-09-29T01:00:00Z");
  const base = {
    status: "Đã hoàn thành",
    total: 100,
    createdAt: "2026-09-28T08:00:00Z",
  };
  expect(
    todayRevenue(
      [
        {
          ...base,
          history: [{ text: "Đã hoàn thành", at: "2026-09-28T17:30:00Z" }],
        },
        { ...base, completedAt: "2026-09-29T00:00:00Z", total: 200 },
        { ...base, createdAt: "2026-09-29T00:00:00Z", total: 50 },
        { ...base, completedAt: "2026-09-28T16:59:00Z" },
        {
          ...base,
          createdAt: "2026-09-29T00:00:00Z",
          status: "Đang giao hàng",
        },
        { ...base, createdAt: "2026-09-29T00:00:00Z", status: "Hoàn tiền" },
        { ...base, createdAt: "invalid" },
      ],
      now,
    ),
  ).toBe(350);
  expect(todayRevenue([], now)).toBe(0);
});

beforeAll(() => {
  vi.stubGlobal("crypto", webcrypto);
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn(() => ({
      matches: false,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
    })),
  });
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  const original = window.getComputedStyle;
  window.getComputedStyle = (element) => original(element);
  window.scrollTo = vi.fn();
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.replaceState({}, "", "/");
});
function start(path, role = "admin") {
  if (role)
    localStorage.setItem(
      "abc-shop-v1-management-session",
      JSON.stringify({ id: role === "admin" ? "admin-demo" : "manager-demo" }),
    );
  window.history.replaceState({}, "", "/management" + path);
  render(<App />);
}
test("management login uses a staff account; manager cannot open admin accounts", async () => {
  start("/users", null);
  expect(
    await screen.findByRole("button", {
      name: "Đăng nhập",
    }),
  ).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "manager@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), {
    target: { value: "123456" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
  expect(
    await screen.findByRole("heading", { name: "Tổng quan" }),
  ).toBeTruthy();
  expect(screen.queryByRole("link", { name: "Tài khoản" })).toBeNull();
  expect(screen.queryByText(/Chế độ demo/)).toBeNull();
  expect(localStorage.getItem("abc-shop-v1-management-session")).not.toContain(
    "123456",
  );
  cleanup();
  start("/users", "manager");
  expect(await screen.findByText("Bạn không có quyền truy cập")).toBeTruthy();
});
test("customer account cannot enter management", async () => {
  start("/login", null);
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "khach1@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), {
    target: { value: "123456" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
  expect(
    await screen.findByText("Tài khoản không có quyền truy cập trang quản lý."),
  ).toBeTruthy();
  expect(window.location.pathname).toBe("/management/login");
});
test("order details are read-only and edit opens a separate form", async () => {
  start("/orders");
  fireEvent.click(
    await screen.findByRole("button", { name: "Chi tiết DEMO-1024" }),
  );
  let dialog = await screen.findByRole("dialog");
  expect(within(dialog).queryByLabelText("Chuyển trạng thái")).toBeNull();
  expect(
    within(dialog).queryByRole("button", { name: "Lưu thay đổi" }),
  ).toBeNull();
  fireEvent.click(
    within(dialog).getAllByRole("button", { name: "Đóng" }).at(-1),
  );
  fireEvent.click(screen.getByRole("button", { name: "Sửa DEMO-1024" }));
  dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByLabelText("Chuyển trạng thái")).toBeTruthy();
  expect(
    within(dialog).getByRole("button", { name: "Lưu thay đổi" }),
  ).toBeTruthy();
  fireEvent.change(within(dialog).getByLabelText("Ghi chú nội bộ"), {
    target: { value: "Giao buổi sáng" },
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "Lưu thay đổi" }));
  await waitFor(() =>
    expect(
      JSON.parse(localStorage.getItem("abc-shop-v1-management-orders")).find(
        (o) => o.id === "DEMO-1024",
      ).note,
    ).toBe("Giao buổi sáng"),
  );
});
test("conversation sends with Enter, supports multiline drafts and ignores whitespace", async () => {
  start("/messages");
  const input = await screen.findByRole("textbox", {
    name: "Nội dung trả lời",
  });
  fireEvent.change(input, { target: { value: "Xin chào khách hàng" } });
  fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
  expect(
    within(screen.getByRole("log")).queryByText("Xin chào khách hàng"),
  ).toBeNull();
  fireEvent.keyDown(input, { key: "Enter" });
  expect(
    await within(screen.getByRole("log")).findByText("Xin chào khách hàng"),
  ).toBeTruthy();
  expect(input.value).toBe("");
  fireEvent.change(input, { target: { value: "   " } });
  expect(screen.getByRole("button", { name: "Gửi tin nhắn" }).disabled).toBe(
    true,
  );
});
test("reports display charts and removed roles route returns not found", async () => {
  start("/reports");
  expect(
    await screen.findByRole("region", { name: "Biểu đồ doanh thu" }),
  ).toBeTruthy();
  expect(
    screen.getByRole("region", { name: "Biểu đồ trạng thái đơn" }),
  ).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Năm báo cáo"), {
    target: { value: "2000" },
  });
  expect(await screen.findByText("Chưa có doanh thu trong kỳ")).toBeTruthy();
  expect(screen.queryByRole("link", { name: "Phân quyền" })).toBeNull();
  cleanup();
  start("/roles");
  expect(await screen.findByText("Không tìm thấy trang")).toBeTruthy();
});
test("category popup adds, edits and deletes selected rows with persistence", async () => {
  start("/categories");
  fireEvent.click(await screen.findByRole("button", { name: "Thêm danh mục" }));
  let dialog = await screen.findByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("Tên danh mục"), {
    target: { value: "Phụ kiện mới" },
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "Lưu" }));
  const name = await screen.findByText("Phụ kiện mới");
  expect(
    JSON.parse(localStorage.getItem("abc-shop-v1-management-categories")),
  ).toContain("Phụ kiện mới");
  fireEvent.click(
    within(name.closest("tr")).getByRole("button", { name: "Sửa" }),
  );
  dialog = await screen.findByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("Tên danh mục"), {
    target: { value: "Phụ kiện sửa" },
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "Lưu" }));
  const renamed = await screen.findByText("Phụ kiện sửa");
  fireEvent.click(within(renamed.closest("tr")).getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Xóa đã chọn (1)" }));
  fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
  await waitFor(() => expect(screen.queryByText("Phụ kiện sửa")).toBeNull());
});
test("product popup saves a new product and its variant", async () => {
  start("/products");
  fireEvent.click(await screen.findByRole("button", { name: /Thêm sản phẩm/ }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("Tên sản phẩm"), {
    target: { value: "Sản phẩm kiểm thử" },
  });
  fireEvent.mouseDown(within(dialog).getByLabelText("Danh mục"));
  fireEvent.click(
    await screen.findByText("Danh mục 1", {
      selector: ".ant-select-item-option-content",
    }),
  );
  fireEvent.change(within(dialog).getByLabelText("Giá bán (đ)"), {
    target: { value: "150000" },
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "Lưu sản phẩm" }));
  await waitFor(() =>
    expect(
      JSON.parse(localStorage.getItem("abc-shop-v1-management-products")).some(
        (p) => p.name === "Sản phẩm kiểm thử" && p.variants[0].price === 150000,
      ),
    ).toBe(true),
  );
});
test("shop settings persist and update the customer storefront", async () => {
  start("/settings");
  fireEvent.change(await screen.findByLabelText("Tên cửa hàng"), {
    target: { value: "Cửa hàng Huyền" },
  });
  fireEvent.change(screen.getByLabelText("Số điện thoại"), {
    target: { value: "0912345678" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Lưu thay đổi/ }));
  await waitFor(() =>
    expect(JSON.parse(localStorage.getItem("abc-shop-v1-shop-info")).name).toBe(
      "Cửa hàng Huyền",
    ),
  );
  await waitFor(() => expect(document.title).toBe("Cửa hàng Huyền"));
  fireEvent.click(screen.getByRole("link", { name: /Xem cửa hàng/ }));
  expect((await screen.findAllByText("Cửa hàng Huyền")).length).toBeGreaterThan(
    0,
  );
  expect(await screen.findByText("0912345678")).toBeTruthy();
});

test("product image upload uses the API URL and preserves the current image on failure", async () => {
  const imageUrl =
    "/api/product-images/11111111-1111-4111-8111-111111111111.webp";
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ url: imageUrl }) })
    .mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "MinIO đang tắt" }),
    });
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => ({ width: 1600, height: 800, close() {} })),
  );
  const context = vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockReturnValue({ drawImage() {} });
  const blob = vi
    .spyOn(HTMLCanvasElement.prototype, "toBlob")
    .mockImplementation((callback) =>
      callback(new Blob(["webp"], { type: "image/webp" })),
    );
  try {
    start("/products");
    fireEvent.click(
      await screen.findByRole("button", { name: /Thêm sản phẩm/ }),
    );
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(dialog.querySelector('input[type="file"]'), {
      target: {
        files: [new File(["image"], "photo.png", { type: "image/png" })],
      },
    });
    await waitFor(() =>
      expect(within(dialog).getByLabelText("Đường dẫn ảnh").value).toBe(
        imageUrl,
      ),
    );
    expect(fetchMock.mock.calls[0][0]).toBe("/api/product-images");
    expect(fetchMock.mock.calls[0][1].body.type).toBe("image/webp");
    fireEvent.change(dialog.querySelector('input[type="file"]'), {
      target: {
        files: [new File(["other"], "other.png", { type: "image/png" })],
      },
    });
    await screen.findByText("MinIO đang tắt");
    expect(within(dialog).getByLabelText("Đường dẫn ảnh").value).toBe(imageUrl);
  } finally {
    vi.unstubAllGlobals();
    context.mockRestore();
    blob.mockRestore();
  }
}, 15000);

test("inventory status boundaries and quantity range are consistent", () => {
  expect([0, 1, 5, 6].map(stockStatus)).toEqual([
    "Hết hàng",
    "Còn hàng",
    "Còn hàng",
    "Còn hàng",
  ]);
  const rows = [0, 1, 5, 6].map((stock) => ({
    stock,
    product: "Áo",
    label: "Đỏ",
  }));
  expect(
    filterInventory(rows, { status: "Còn hàng", min: 2, max: 5 }).map(
      (r) => r.stock,
    ),
  ).toEqual([5]);
  expect(filterInventory(rows, { min: 6, max: 2 })).toEqual([]);
  expect(filterInventory(rows, { query: "đỏ" })).toHaveLength(4);
  expect([0, 1, 5, 6].map((n) => isLowStock(n, 5))).toEqual([
    false,
    true,
    true,
    false,
  ]);
  expect(isLowStock(6, 10)).toBe(true);
});

test("select all orders spans pages and deleting updates both order sources", async () => {
  localStorage.setItem(
    "abc-shop-v1-orders",
    JSON.stringify([
      {
        id: "CUSTOMER-1",
        owner: "test@example.com",
        total: 10,
        status: "Chờ xác nhận",
      },
    ]),
  );
  start("/orders");
  fireEvent.click(
    await screen.findByRole("checkbox", { name: "Chọn tất cả (13)" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Xóa đã chọn (13)" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Xóa", exact: true }),
  );
  await waitFor(() =>
    expect(
      JSON.parse(localStorage.getItem("abc-shop-v1-management-orders")),
    ).toEqual([]),
  );
  expect(JSON.parse(localStorage.getItem("abc-shop-v1-orders"))).toEqual([]);
});

test("payment notes persist and deleting payment rows preserves the order", async () => {
  start("/payments");
  fireEvent.click(
    await screen.findByRole("button", { name: "Ghi chú DEMO-1024" }),
  );
  fireEvent.change(
    screen.getByRole("textbox", { name: "Ghi chú thanh toán" }),
    {
      target: { value: "Chờ đối soát ngân hàng" },
    },
  );
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Xác nhận",
    }),
  );
  await waitFor(() =>
    expect(
      JSON.parse(localStorage.getItem("abc-shop-v1-management-orders"))[0]
        .paymentNote,
    ).toBe("Chờ đối soát ngân hàng"),
  );
  fireEvent.click(screen.getByRole("checkbox", { name: "Chọn tất cả (12)" }));
  fireEvent.click(screen.getByRole("button", { name: "Xóa đã chọn (12)" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Xóa", exact: true }),
  );
  await waitFor(() =>
    expect(
      JSON.parse(
        localStorage.getItem("abc-shop-v1-management-hidden-payments"),
      ),
    ).toHaveLength(12),
  );
  expect(
    JSON.parse(localStorage.getItem("abc-shop-v1-management-orders")),
  ).toHaveLength(12);
  fireEvent.click(
    screen.getByRole("button", { name: "Khôi phục danh sách thanh toán" }),
  );
  expect(
    await screen.findByText("Chờ đối soát ngân hàng", { selector: "td span" }),
  ).toBeTruthy();
});

test("inventory bulk deletion preserves stock and can be restored", async () => {
  const products = initialProducts.map((p) => ({
    ...p,
    variants: p.variants.map((v) => ({ ...v, stock: 3 })),
  }));
  localStorage.setItem(
    "abc-shop-v1-management-products",
    JSON.stringify(products),
  );
  start("/inventory");
  const count = products.flatMap((p) => p.variants).length;
  fireEvent.click(
    screen.getByRole("checkbox", { name: `Chọn tất cả (${count})` }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: `Xóa đã chọn (${count})` }),
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Xóa", exact: true }),
  );
  await waitFor(() =>
    expect(
      JSON.parse(
        localStorage.getItem("abc-shop-v1-management-hidden-inventory"),
      ),
    ).toHaveLength(count),
  );
  expect(
    JSON.parse(localStorage.getItem("abc-shop-v1-management-products")),
  ).toEqual(products);
  fireEvent.click(
    screen.getByRole("button", { name: "Khôi phục danh sách kho" }),
  );
  expect(
    screen.getByRole("checkbox", { name: `Chọn tất cả (${count})` }).disabled,
  ).toBe(false);
});

test("staff conversation menu persists unread, pin, delete and restore without removing customer history", async () => {
  start("/messages");
  const openMenu = async () =>
    fireEvent.click(
      await screen.findByRole("button", { name: "Tùy chọn hội thoại" }),
    );
  const preferences = () =>
    JSON.parse(localStorage.getItem("abc-shop-v1-management-chat-preferences"))[
      "admin-demo"
    ]["khach1@example.com"];
  fireEvent.click(
    await screen.findByRole("button", { name: "Đánh dấu đã đọc" }),
  );
  await openMenu();
  fireEvent.click(await screen.findByText("Đánh dấu chưa đọc"));
  await waitFor(() => expect(preferences().unread).toBe(true));
  await openMenu();
  fireEvent.click(await screen.findByText("Ghim hội thoại"));
  await waitFor(() => expect(preferences().pinned).toBe(true));
  await openMenu();
  fireEvent.click(await screen.findByText("Xóa hội thoại"));
  fireEvent.click(
    within(await screen.findByRole("dialog")).getByRole("button", {
      name: "Xóa hội thoại",
    }),
  );
  await waitFor(() => expect(preferences().hidden).toBe(true));
  expect(screen.queryByRole("log")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Khôi phục hội thoại" }));
  fireEvent.click(
    await screen.findByRole("menuitem", { name: /Nguyễn Minh Anh/ }),
  );
  expect(
    await within(await screen.findByRole("log")).findByText(
      "Shop ơi, cho mình hỏi đơn hàng bao giờ được giao ạ?",
    ),
  ).toBeTruthy();
  await waitFor(() => expect(preferences().hidden).toBe(false));
});

test("conversation keeps a way back when marking the last unread conversation read", async () => {
  start("/messages");
  fireEvent.click(await screen.findByRole("radio", { name: "Chưa đọc" }));
  const list = screen.getByRole("complementary", {
    name: "Danh sách hội thoại",
  });
  fireEvent.click(within(list).getByRole("button", { pressed: true }));
  fireEvent.click(screen.getByRole("button", { name: "Đánh dấu đã đọc" }));
  expect(screen.queryByRole("log")).toBeNull();
  expect(document.querySelector(".mg-messenger-selected")).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Về danh sách hội thoại" }),
  );
  expect(document.querySelector(".mg-messenger-selected")).toBeNull();
  expect(within(list).getByText("Không có hội thoại")).toBeTruthy();
});

test("staff can start a conversation and mark incoming messages read", async () => {
  start("/messages");
  fireEvent.click(
    await screen.findByRole("button", { name: "Đánh dấu đã đọc" }),
  );
  await waitFor(() =>
    expect(
      JSON.parse(localStorage.getItem("abc-shop-v1-management-read-messages"))[
        "admin-demo"
      ],
    ).toContain("hello"),
  );
  fireEvent.click(screen.getByRole("button", { name: "Thêm hội thoại" }));
  fireEvent.change(screen.getByLabelText("Email khách hàng"), {
    target: { value: "new@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Tin nhắn đầu tiên"), {
    target: { value: "Shop xin chào bạn" },
  });
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Gửi tin nhắn",
    }),
  );
  expect(
    await within(screen.getByRole("log")).findByText("Shop xin chào bạn"),
  ).toBeTruthy();
  expect(JSON.parse(localStorage.getItem("abc-shop-v1-chat"))).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        owner: "new@example.com",
        from: "shop",
        text: "Shop xin chào bạn",
      }),
    ]),
  );
});

test("setting a staff password persists a hash and enforces it at login", async () => {
  start("/users");
  fireEvent.click(
    await screen.findByRole("button", {
      name: "Đặt hoặc reset mật khẩu manager@example.com",
    }),
  );
  fireEvent.change(screen.getByLabelText("Mật khẩu mới"), {
    target: { value: "NewPassword123" },
  });
  fireEvent.change(screen.getByLabelText("Nhập lại mật khẩu"), {
    target: { value: "NewPassword123" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Lưu mật khẩu" }));
  await waitFor(() =>
    expect(
      JSON.parse(localStorage.getItem("abc-shop-v1-management-users")).find(
        (u) => u.id === "manager-demo",
      ).credential,
    ).toBeTruthy(),
  );
  const saved = localStorage.getItem("abc-shop-v1-management-users");
  expect(saved).not.toContain("NewPassword123");
  const credential = JSON.parse(saved).find(
    (u) => u.id === "manager-demo",
  ).credential;
  expect(await matchesPassword("NewPassword123", credential)).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Đăng xuất quản trị" }));
  fireEvent.change(await screen.findByLabelText("Email"), {
    target: { value: "manager@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), {
    target: { value: "WrongPassword" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
  expect(await screen.findByText("Mật khẩu không đúng.")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Mật khẩu"), {
    target: { value: "NewPassword123" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
  expect(
    await screen.findByRole("heading", { name: "Tổng quan" }),
  ).toBeTruthy();
});

test("pinning a product moves it before unpinned products", async () => {
  const products = initialProducts.map((p) => ({ ...p, featured: false }));
  localStorage.setItem(
    "abc-shop-v1-management-products",
    JSON.stringify(products),
  );
  start("/products");
  fireEvent.click(
    await screen.findByRole("switch", { name: `Ghim ${products[1].name}` }),
  );
  const firstRow = document.querySelector(".ant-table-tbody tr.ant-table-row");
  expect(firstRow.textContent).toContain(products[1].name);
});

test("stock adjustment prevents negative/fractional stock without mutating input", () => {
  const changed = adjustStock(initialProducts, 1, "standard", -3);
  expect(changed[0].variants[0].stock).toBe(17);
  expect(initialProducts[0].variants[0].stock).toBe(20);
  expect(() => adjustStock(initialProducts, 1, "standard", -21)).toThrow();
  expect(() => adjustStock(initialProducts, 1, "standard", 1.5)).toThrow();
});
test("order workflow requires shipment and full payment; terminal orders cannot restart", () => {
  const order = { status: "Đã đóng gói", total: 100000, paid: 0 };
  expect(() => transitionOrder(order, "Đang giao hàng")).toThrow();
  const shipped = transitionOrder(order, "Đang giao hàng", {
    carrier: "GHN",
    tracking: "VN123",
  });
  expect(shipped.status).toBe("Đang giao hàng");
  const delivered = transitionOrder(shipped, "Giao thành công");
  expect(() => transitionOrder(delivered, "Đã hoàn thành")).toThrow();
  expect(
    transitionOrder({ ...delivered, paid: 100000 }, "Đã hoàn thành").status,
  ).toBe("Đã hoàn thành");
  expect(() =>
    transitionOrder({ ...order, status: "Đã hủy" }, "Đã xác nhận"),
  ).toThrow();
});
