// @vitest-environment jsdom
import { beforeAll, afterEach, expect, test, vi } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    value: vi.fn(() => ({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
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
test("guest must log in before checkout", async () => {
  window.history.replaceState({}, "", "/checkout");
  render(<App />);
  await screen.findByRole("button", { name: "Đăng nhập demo" });
  expect(window.location.pathname).toBe("/login");
});

test("guest cannot add to cart and cart link is hidden", async () => {
  window.history.replaceState({}, "", "/products/1");
  render(<App />);
  expect(
    screen.queryByRole("link", { name: "Giỏ hàng", exact: true }),
  ).toBeNull();
  await userEvent.click(
    screen.getByRole("button", { name: "Thêm vào giỏ", exact: true }),
  );
  await screen.findByRole("button", { name: "Đăng nhập demo" });
  expect(JSON.parse(localStorage.getItem("abc-shop-v1-cart"))).toEqual([]);
});

test("logout hides the cart and another account cannot see its contents", async () => {
  localStorage.setItem(
    "abc-shop-v1-user",
    JSON.stringify({ name: "Demo", email: "first@example.com" }),
  );
  localStorage.setItem(
    "abc-shop-v1-cart",
    JSON.stringify([
      {
        key: "1-standard",
        id: 1,
        variantId: "standard",
        quantity: 2,
        selected: true,
        owner: "first@example.com",
      },
    ]),
  );
  render(<App />);
  await userEvent.click(screen.getByRole("button", { name: /Demo/ }));
  await userEvent.click(
    await screen.findByRole("menuitem", { name: "Đăng xuất" }),
  );
  expect(
    screen.queryByRole("link", { name: "Giỏ hàng", exact: true }),
  ).toBeNull();
  cleanup();
  localStorage.setItem(
    "abc-shop-v1-user",
    JSON.stringify({ name: "Second", email: "second@example.com" }),
  );
  window.history.replaceState({}, "", "/cart");
  render(<App />);
  await screen.findByText("Giỏ hàng đang trống");
  expect(JSON.parse(localStorage.getItem("abc-shop-v1-cart"))[0].quantity).toBe(
    2,
  );
});

test("catalog supports a nonzero lower price bound", async () => {
  render(<App />);
  const before = document.querySelectorAll(".product-card").length;
  fireEvent.change(screen.getByRole("spinbutton", { name: "Giá từ" }), {
    target: { value: "1000000" },
  });
  fireEvent.blur(screen.getByRole("spinbutton", { name: "Giá từ" }));
  expect(document.querySelectorAll(".product-card").length).toBeLessThan(
    before,
  );
});

test("checkout can add and select an address without leaving the order", async () => {
  localStorage.setItem(
    "abc-shop-v1-user",
    JSON.stringify({
      name: "Demo",
      email: "address@example.com",
      phone: "0912345678",
    }),
  );
  window.history.replaceState({}, "", "/checkout?buy=1-standard");
  render(<App />);
  await userEvent.click(
    screen.getByRole("combobox", { name: "Chọn địa chỉ đã lưu" }),
  );
  await userEvent.click(
    await screen.findByText("Thêm địa chỉ", {
      selector: ".ant-select-item-option-content",
    }),
  );
  await userEvent.click(screen.getByLabelText("Tỉnh / Thành phố"));
  await userEvent.click(
    await screen.findByText("Thành phố Hà Nội", {
      selector: ".ant-select-item-option-content",
    }),
  );
  await userEvent.click(screen.getByLabelText("Phường / Xã"));
  await userEvent.click(
    await screen.findByText("Phường Ba Đình", {
      selector: ".ant-select-item-option-content",
    }),
  );
  await userEvent.type(screen.getByLabelText("Địa chỉ chi tiết"), "12 Đường A");
  await userEvent.click(screen.getByRole("button", { name: "Lưu địa chỉ" }));
  expect(
    screen.getByLabelText("Địa chỉ nhận hàng", { exact: true }).value,
  ).toBe("12 Đường A, Phường Ba Đình, Thành phố Hà Nội");
  await userEvent.click(
    screen.getByRole("button", { name: "Tiếp tục thanh toán" }),
  );
  await screen.findByRole("button", { name: "Xác nhận đặt hàng demo" });
});

test("registration rejects mismatched confirmation", async () => {
  window.history.replaceState({}, "", "/login");
  render(<App />);
  await userEvent.click(screen.getByRole("tab", { name: "Đăng ký" }));
  await userEvent.type(screen.getByLabelText("Họ và tên"), "Demo");
  await userEvent.type(screen.getByLabelText("Email"), "new@example.com");
  await userEvent.type(
    screen.getByLabelText("Mật khẩu demo (không lưu)"),
    "abcdef",
  );
  await userEvent.type(screen.getByLabelText("Xác nhận mật khẩu"), "abcdefg");
  await userEvent.click(screen.getByRole("button", { name: "Tạo hồ sơ demo" }));
  await screen.findByText("Mật khẩu không khớp");
  expect(JSON.parse(localStorage.getItem("abc-shop-v1-user"))).toBeNull();
});

test("shipping disables cash and payment simulation persists a paid order", async () => {
  localStorage.setItem(
    "abc-shop-v1-user",
    JSON.stringify({
      name: "Demo",
      email: "pay@example.com",
      phone: "0912345678",
      address: "Hà Nội",
    }),
  );
  window.history.replaceState({}, "", "/checkout?buy=1-standard");
  render(<App />);
  expect(
    screen.getByLabelText("Địa chỉ nhận hàng", { exact: true }).readOnly,
  ).toBe(true);
  await userEvent.click(
    screen.getByRole("button", { name: "Tiếp tục thanh toán" }),
  );
  expect(screen.getByRole("radio", { name: "Khi nhận hàng" }).disabled).toBe(
    true,
  );
  await userEvent.click(screen.getByRole("button", { name: "Quay lại" }));
  await userEvent.click(
    screen.getByRole("radio", { name: "Nhận tại cửa hàng" }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Tiếp tục thanh toán" }),
  );
  expect(screen.getByRole("radio", { name: "Khi nhận hàng" }).disabled).toBe(
    false,
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Xác nhận đặt hàng demo" }),
  );
  await screen.findByRole("timer");
  await userEvent.click(
    screen.getByRole("button", { name: "Mô phỏng thanh toán thành công" }),
  );
  const order = JSON.parse(localStorage.getItem("abc-shop-v1-orders"))[0];
  expect(order.paid).toBe(order.total);
  expect(order.remaining).toBe(0);
});
test("customer applies a coupon before payment, buys with a deposit, then cancels pending order", async () => {
  const user = userEvent.setup();
  localStorage.setItem(
    "abc-shop-v1-user",
    JSON.stringify({
      name: "Khách Demo",
      email: "demo@example.com",
      phone: "0912345678",
      address: "123 Nguyễn Trãi, Hà Nội",
    }),
  );
  window.history.replaceState({}, "", "/products/3");
  render(<App />);
  await user.click(
    screen.getByRole("button", { name: "Mua ngay", exact: true }),
  );
  await user.type(screen.getByLabelText("Mã giảm giá"), "abc10");
  await user.click(
    screen.getByRole("button", { name: "Áp dụng", exact: true }),
  );
  await user.click(
    await screen.findByRole("button", { name: "Tiếp tục thanh toán" }),
  );
  await screen.findByRole("button", { name: "Xác nhận đặt hàng demo" });
  await user.click(screen.getByText("Đặt cọc 50%", { exact: true }));
  expect(screen.queryByLabelText("Mã giảm giá")).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Áp dụng", exact: true }),
  ).toBeNull();
  const summary = document.querySelector("aside.summary");
  expect(summary.querySelectorAll(":scope > p")).toHaveLength(4);
  expect(summary.querySelector(".mini-product")).toBeNull();
  expect(summary.textContent).toContain("Giảm giá");
  await user.click(
    screen.getByRole("button", { name: "Xác nhận đặt hàng demo" }),
  );
  await userEvent.click(
    await screen.findByRole("button", { name: "Xem đơn hàng" }),
  );
  await screen.findByRole("button", { name: "Xem chi tiết" });
  let orders = JSON.parse(localStorage.getItem("abc-shop-v1-orders"));
  expect(orders).toHaveLength(1);
  expect(orders[0].total).toBe(443100);
  expect(orders[0].off).toBe(45900);
  expect(orders[0].deposit).toBe(221550);
  expect(orders[0].paid).toBe(0);
  expect(orders[0].remaining).toBe(443100);
  expect(JSON.parse(localStorage.getItem("abc-shop-v1-cart"))).toEqual([]);
  await user.click(
    screen.getByRole("button", { name: "Hủy đơn", exact: true }),
  );
  await user.click(await screen.findByRole("button", { name: "Xác nhận hủy" }));
  await waitFor(() =>
    expect(
      JSON.parse(localStorage.getItem("abc-shop-v1-orders"))[0].status,
    ).toBe("Đã hủy"),
  );
});
test("cart checkout retains unselected products", async () => {
  localStorage.setItem(
    "abc-shop-v1-user",
    JSON.stringify({
      name: "Demo",
      email: "test@example.com",
      phone: "0912345678",
      address: "Hà Nội",
    }),
  );
  localStorage.setItem(
    "abc-shop-v1-cart",
    JSON.stringify([
      {
        key: "1-standard",
        id: 1,
        variantId: "standard",
        quantity: 2,
        selected: true,
      },
      {
        key: "3-standard",
        id: 3,
        variantId: "standard",
        quantity: 1,
        selected: false,
      },
    ]),
  );
  window.history.replaceState({}, "", "/checkout");
  render(<App />);
  await userEvent.click(
    await screen.findByRole("button", { name: "Tiếp tục thanh toán" }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Xác nhận đặt hàng demo" }),
  );
  await userEvent.click(
    await screen.findByRole("button", { name: "Xem đơn hàng" }),
  );
  await screen.findByRole("button", { name: "Xem chi tiết" });
  expect(
    JSON.parse(localStorage.getItem("abc-shop-v1-cart")).map((p) => p.key),
  ).toEqual(["3-standard"]);
  expect(JSON.parse(localStorage.getItem("abc-shop-v1-orders"))[0].total).toBe(
    528000,
  );
});
test("catalog search and out of stock product state", async () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText("Tìm trong danh sách sản phẩm"), {
    target: { value: "không có sản phẩm" },
  });
  await screen.findByText("Không tìm thấy sản phẩm phù hợp");
  cleanup();
  window.history.replaceState({}, "", "/products/8");
  render(<App />);
  expect(
    screen.getByRole("button", { name: "Mua ngay", exact: true }).disabled,
  ).toBe(true);
});

test("variant selection carries its own price, label and stock into cart", async () => {
  const user = userEvent.setup();
  localStorage.setItem(
    "abc-shop-v1-user",
    JSON.stringify({ name: "Demo", email: "demo@example.com" }),
  );
  window.history.replaceState({}, "", "/products/3");
  render(<App />);
  await user.click(screen.getByText("Tùy chọn 2 · Đen", { exact: true }));
  await user.click(
    screen.getByRole("button", { name: "Thêm vào giỏ", exact: true }),
  );
  await user.click(screen.getByRole("link", { name: "Giỏ hàng", exact: true }));
  await screen.findByText("Đen / Phân loại: Tùy chọn 2");
  expect(
    JSON.parse(localStorage.getItem("abc-shop-v1-cart"))[0].variantId,
  ).toBe("option-2");
  expect(
    screen
      .getByRole("spinbutton", { name: "Số lượng Sản phẩm 03" })
      .getAttribute("aria-valuemax"),
  ).toBe("8");
});

test("saved address can be created and is used as the checkout default", async () => {
  const user = userEvent.setup();
  localStorage.setItem(
    "abc-shop-v1-user",
    JSON.stringify({
      name: "Demo",
      email: "demo@example.com",
      phone: "0912345678",
    }),
  );
  window.history.replaceState({}, "", "/account");
  render(<App />);
  await user.click(screen.getByRole("tab", { name: "Địa chỉ nhận hàng" }));
  await user.click(
    screen.getByRole("button", { name: "Thêm địa chỉ", exact: true }),
  );
  await user.type(
    screen.getByLabelText("Địa chỉ chi tiết", { exact: true }),
    "123 Đường A",
  );
  await user.click(screen.getByLabelText("Tỉnh / Thành phố"));
  await user.click(
    await screen.findByText("Thành phố Hà Nội", {
      selector: ".ant-select-item-option-content",
    }),
  );
  await user.click(screen.getByLabelText("Phường / Xã"));
  await user.click(
    await screen.findByText("Phường Ba Đình", {
      selector: ".ant-select-item-option-content",
    }),
  );
  await user.click(screen.getByRole("button", { name: "Lưu địa chỉ" }));
  await waitFor(() =>
    expect(
      JSON.parse(localStorage.getItem("abc-shop-v1-user")).addresses,
    ).toHaveLength(1),
  );
  cleanup();
  localStorage.setItem(
    "abc-shop-v1-cart",
    JSON.stringify([
      {
        key: "1-standard",
        id: 1,
        variantId: "standard",
        quantity: 1,
        selected: true,
      },
    ]),
  );
  window.history.replaceState({}, "", "/checkout");
  render(<App />);
  expect(
    screen.getByLabelText("Địa chỉ nhận hàng", { exact: true }).value,
  ).toBe("123 Đường A, Phường Ba Đình, Thành phố Hà Nội");
});

test("buy now deducts purchased quantities and 70 percent deposit works", async () => {
  const cart = [
    {
      key: "1-standard",
      id: 1,
      variantId: "standard",
      quantity: 4,
      selected: true,
    },
  ];
  localStorage.setItem("abc-shop-v1-cart", JSON.stringify(cart));
  localStorage.setItem(
    "abc-shop-v1-user",
    JSON.stringify({
      name: "Demo",
      email: "test@example.com",
      phone: "0912345678",
      address: "Hà Nội",
    }),
  );
  window.history.replaceState({}, "", "/products/1");
  render(<App />);
  await userEvent.click(
    screen.getByRole("button", { name: "Mua ngay", exact: true }),
  );
  expect(JSON.parse(localStorage.getItem("abc-shop-v1-cart"))[0].quantity).toBe(
    4,
  );
  const input = screen.getByRole("spinbutton");
  expect(input.value).toBe("1");
  fireEvent.change(input, { target: { value: "2" } });
  fireEvent.blur(input);
  await userEvent.click(
    screen.getByRole("button", { name: "Tiếp tục thanh toán" }),
  );
  await userEvent.click(screen.getByText("Đặt cọc 70%", { exact: true }));
  await userEvent.click(
    screen.getByRole("button", { name: "Xác nhận đặt hàng demo" }),
  );
  expect(JSON.parse(localStorage.getItem("abc-shop-v1-cart"))[0].quantity).toBe(
    2,
  );
  const order = JSON.parse(localStorage.getItem("abc-shop-v1-orders"))[0];
  expect(order.items[0].quantity).toBe(2);
  expect(order.depositRate).toBe(0.7);
  expect(order.deposit).toBe(Math.round(order.total * 0.7));
  await userEvent.click(screen.getByRole("button", { name: "Xem đơn hàng" }));
  await userEvent.click(screen.getByRole("button", { name: "Xem chi tiết" }));
  expect(screen.getByRole("columnheader", { name: "Đơn giá" })).toBeTruthy();
});

test("reviews validate rating, persist content and do not leak to another product", async () => {
  const user = userEvent.setup();
  localStorage.setItem(
    "abc-shop-v1-user",
    JSON.stringify({ name: "Reviewer", email: "review@example.com" }),
  );
  window.history.replaceState({}, "", "/products/1");
  render(<App />);
  await user.click(screen.getByRole("button", { name: "Gửi đánh giá" }));
  await screen.findByText("Vui lòng chọn từ 1 đến 5 sao");
  // Ant Design Rate renders one radio per star.
  const ratings = screen
    .getAllByRole("radio")
    .filter((el) => el.closest(".review-form"));
  await user.click(ratings[4]);
  await user.type(
    screen.getByLabelText("Nhận xét"),
    "Sản phẩm phù hợp với nhu cầu",
  );
  await user.click(screen.getByRole("button", { name: "Gửi đánh giá" }));
  await waitFor(() =>
    expect(
      JSON.parse(localStorage.getItem("abc-shop-v1-reviews")),
    ).toHaveLength(1),
  );
  expect(screen.getByText("5.0 / 5")).toBeTruthy();
  cleanup();
  window.history.replaceState({}, "", "/products/2");
  render(<App />);
  expect(screen.queryByText("Sản phẩm phù hợp với nhu cầu")).toBeNull();
});

test("review photos are optional", async () => {
  localStorage.setItem(
    "abc-shop-v1-user",
    JSON.stringify({ name: "Demo", email: "demo@example.com" }),
  );
  window.history.replaceState({}, "", "/products/1");
  render(<App />);
  expect(screen.queryByLabelText("Múi giờ hiển thị")).toBeNull();
  const createURL = vi.fn(() => "blob:review-test");
  const revokeURL = vi.fn();
  const originalCreate = URL.createObjectURL,
    originalRevoke = URL.revokeObjectURL;
  URL.createObjectURL = createURL;
  URL.revokeObjectURL = revokeURL;
  const RealImage = window.Image;
  window.Image = class {
    width = 40;
    height = 40;
    set src(value) {
      queueMicrotask(() => this.onload());
    }
  };
  const ctx = vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockReturnValue({ fillRect() {}, drawImage() {} });
  const data = vi
    .spyOn(HTMLCanvasElement.prototype, "toDataURL")
    .mockReturnValue("data:image/jpeg;base64,dGVzdA==");
  try {
    fireEvent.change(screen.getByLabelText("Ảnh đánh giá (không bắt buộc)"), {
      target: {
        files: [new File(["image"], "photo.png", { type: "image/png" })],
      },
    });
    await screen.findByRole("button", { name: "Xóa ảnh" });
    await userEvent.click(
      screen
        .getAllByRole("radio")
        .filter((el) => el.closest(".review-form"))[4],
    );
    await userEvent.type(screen.getByLabelText("Nhận xét"), "Ảnh sản phẩm");
    await userEvent.click(screen.getByRole("button", { name: "Gửi đánh giá" }));
    await waitFor(() =>
      expect(
        JSON.parse(localStorage.getItem("abc-shop-v1-reviews"))[0].images,
      ).toHaveLength(1),
    );
  } finally {
    window.Image = RealImage;
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    ctx.mockRestore();
    data.mockRestore();
  }
});

test("account menu opens language and timezone settings", async () => {
  localStorage.setItem(
    "abc-shop-v1-user",
    JSON.stringify({ name: "Demo", email: "demo@example.com" }),
  );
  render(<App />);
  expect(document.querySelector('header a[href="/?featured=true"]')).toBeNull();
  expect(screen.queryByLabelText("Ngôn ngữ")).toBeNull();
  expect(screen.queryByLabelText("Múi giờ hiển thị")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: /Demo/ }));
  await userEvent.click(
    await screen.findByRole("menuitem", { name: "Cài đặt" }),
  );
  expect(window.location.pathname).toBe("/settings");
  expect(screen.getByRole("heading", { name: "Cài đặt" })).toBeTruthy();
  expect(screen.getByLabelText("Ngôn ngữ").closest("main")).toBeTruthy();
  expect(
    screen.getByLabelText("Múi giờ hiển thị").closest("main"),
  ).toBeTruthy();
});
