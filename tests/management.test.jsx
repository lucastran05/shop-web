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
import {
  adjustStock,
  initialProducts,
  transitionOrder,
} from "../src/management/model";

beforeAll(() => {
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
  fireEvent.click(screen.getByRole("button", { name: "Xóa đã chọn" }));
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
