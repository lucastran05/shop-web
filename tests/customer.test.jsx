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
test("customer buys with a deposit, persists unpaid order, then cancels pending order", async () => {
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
  await screen.findByRole("button", { name: "Xác nhận đặt hàng demo" });
  await user.click(screen.getByText("Đặt cọc 20%", { exact: true }));
  await user.type(screen.getByLabelText("Mã giảm giá"), "ABC10");
  await user.click(screen.getByRole("button", { name: "Áp dụng" }));
  await user.click(
    screen.getByRole("button", { name: "Xác nhận đặt hàng demo" }),
  );
  await screen.findByRole("button", { name: "Xem chi tiết" });
  let orders = JSON.parse(localStorage.getItem("abc-shop-v1-orders"));
  expect(orders).toHaveLength(1);
  expect(orders[0].total).toBe(443100);
  expect(orders[0].deposit).toBe(88620);
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
    screen.getByRole("button", { name: "Xác nhận đặt hàng demo" }),
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
    screen.getByLabelText("Địa chỉ", { exact: true }),
    "123 Đường A, Hà Nội",
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
  ).toBe("123 Đường A, Hà Nội");
});
