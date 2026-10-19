// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { App as AntApp } from "antd";
import { MemoryRouter, Navigate, Route, Routes } from "react-router-dom";
import { ShopProvider } from "../../src/context/ShopContext";
import { ManagementProvider } from "../../src/context/ManagementContext";
import CustomerLayout from "../../src/layouts/CustomerLayout";
import { useShop } from "../../src/hooks/useShop";
import { useManagement } from "../../src/hooks/useManagement";
import { usePolling } from "../../src/hooks/usePolling";
import MessagesPage from "../../src/pages/management/MessagesPage";

const mocks = vi.hoisted(() => {
  const empty = () =>
    Promise.resolve({
      status: "success",
      data: [],
      pagination: { total_pages: 1 },
    });
  const getProfile = vi.fn();
  const hasSession = vi.fn();
  const listeners = new Set();
  const api = {
    http: {
      hasSession,
      onSessionCleared: (fn) => {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
      clearTokens: () => {
        hasSession.mockReturnValue(false);
        for (const fn of listeners) fn();
      },
    },
    auth: { getProfile, logout: vi.fn() },
    products: { list: vi.fn(empty), categories: vi.fn(empty) },
    shop: { get: vi.fn(async () => ({ data: { name: "Shop", contact: {} } })) },
    cart: { get: vi.fn(async () => ({ data: { items: [] } })) },
    orders: { list: vi.fn(empty) },
    chatAndNotifications: { notifications: vi.fn(empty) },
    adminProducts: { list: vi.fn(empty) },
    adminCategories: { list: vi.fn(empty) },
    adminOrders: { list: vi.fn(empty) },
    adminUsers: { list: vi.fn(empty) },
    adminChat: {
      list: vi.fn(empty),
      messages: vi.fn(empty),
      sendMessage: vi.fn(),
    },
    adminInventory: { adjustments: vi.fn(empty) },
  };
  return { api, listeners };
});
vi.mock("../../src/services/api", () => ({ api: mocks.api }));
vi.mock("antd", async () => {
  const { createElement } = await import("react");
  const Container = ({ children }) => createElement("div", null, children);
  const App = Object.assign(Container, {
    useApp: () => ({ message: { error: vi.fn() } }),
  });
  const Button = ({ children, onClick, disabled, "aria-label": label }) =>
    createElement(
      "button",
      { onClick, disabled, "aria-label": label },
      children,
    );
  const Space = Object.assign(Container, { Compact: Container });
  const Input = ({ value, onChange, ...props }) =>
    createElement("input", {
      value,
      onChange,
      "aria-label": props["aria-label"],
    });
  Input.TextArea = ({ value, onChange, ...props }) =>
    createElement("textarea", {
      value,
      onChange,
      "aria-label": props["aria-label"],
    });
  const form = { resetFields() {}, submit() {} };
  const Form = Object.assign(Container, {
    Item: Container,
    useForm: () => [form],
  });
  const Modal = Object.assign(
    ({ open, children }) =>
      open ? createElement("div", null, children) : null,
    { useModal: () => [{ confirm() {} }, null] },
  );
  return {
    App,
    Button,
    Space,
    Badge: Container,
    Dropdown: Container,
    Popover: Container,
    Tooltip: Container,
    Drawer: ({ open, children }) =>
      open ? createElement("div", null, children) : null,
    Empty: ({ description }) => createElement("div", null, description),
    Input,
    Form,
    Modal,
    Avatar: Container,
    Tag: Container,
    AutoComplete: Container,
    Segmented: ({ options, onChange }) =>
      createElement(
        "div",
        null,
        options.map((option) =>
          createElement(
            "button",
            {
              key: option.value,
              onClick: () => onChange(option.value),
              "data-filter": option.value,
            },
            option.label,
          ),
        ),
      ),
    Spin: () => createElement("div", { role: "status" }, "Loading"),
    Result: ({ title, extra }) => createElement("div", null, title, extra),
    Alert: ({ title }) => createElement("div", { role: "alert" }, title),
  };
});
vi.mock("@ant-design/icons", () => ({
  ShoppingOutlined: () => null,
  UserOutlined: () => null,
  BellOutlined: () => null,
  MessageOutlined: () => null,
  ArrowLeftOutlined: () => null,
  SearchOutlined: () => null,
  SendOutlined: () => null,
  PlusOutlined: () => null,
  CheckOutlined: () => null,
  MoreOutlined: () => null,
  PushpinOutlined: () => null,
  MailOutlined: () => null,
  DeleteOutlined: () => null,
  UndoOutlined: () => null,
  ThunderboltOutlined: () => null,
}));
vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init() {} },
  useTranslation: () => ({ t: (value) => value }),
}));
vi.mock("../../src/hooks/usePreferences", () => ({
  usePreferences: () => ({ timeZone: "Asia/Ho_Chi_Minh" }),
}));
vi.mock("../../src/components/HeaderSearch", () => ({ default: () => null }));

beforeAll(() => {
  window.matchMedia = vi.fn(() => ({
    matches: false,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  }));
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  const original = window.getComputedStyle;
  window.getComputedStyle = (element) => original(element);
});
beforeEach(() => {
  localStorage.clear();
  mocks.api.http.hasSession.mockReturnValue(true);
  mocks.api.auth.getProfile.mockResolvedValue({
    data: {
      id: "real-account",
      name: "Account",
      email: "account@example.com",
      role: "customer",
      is_active: true,
    },
  });
  mocks.api.auth.logout.mockImplementation(async () => {
    mocks.api.http.clearTokens();
  });
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
  mocks.listeners.clear();
});

function ProtectedAccount() {
  const { user, logout } = useShop();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <>
      <CustomerLayout />
      <div>Verified account: {user.role}</div>
      <button onClick={logout}>Test logout</button>
    </>
  );
}
function ManagementProbe() {
  const state = useManagement();
  return (
    <div>
      Management session: {state.session?.role || "none"}; products:{" "}
      {state.products.length}; orders: {state.orders.length}; users:{" "}
      {state.users.length}; messages: {state.messages.length}
    </div>
  );
}
function renderSession() {
  return render(
    <AntApp>
      <MemoryRouter initialEntries={["/account"]}>
        <ShopProvider>
          <Routes>
            <Route path="/account" element={<ProtectedAccount />} />
            <Route path="/login" element={<div>Redirected to login</div>} />
            <Route
              path="/management"
              element={
                <ManagementProvider>
                  <ManagementProbe />
                </ManagementProvider>
              }
            />
          </Routes>
        </ShopProvider>
      </MemoryRouter>
    </AntApp>,
  );
}

test("restoration finishes before protected routes decide whether to redirect", async () => {
  let resolve;
  mocks.api.auth.getProfile.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  renderSession();
  expect(screen.queryByText("Redirected to login")).toBeNull();
  await act(async () =>
    resolve({
      data: {
        id: "account",
        name: "Account",
        email: "account@example.com",
        role: "customer",
        is_active: true,
      },
    }),
  );
  await screen.findByText("Verified account: customer");
  expect(screen.queryByText("Redirected to login")).toBeNull();
});

test("a verified admin can enter management directly without a second login or seeded user list", async () => {
  mocks.api.auth.getProfile.mockResolvedValue({
    data: {
      id: "admin-account",
      name: "Admin",
      email: "admin@example.com",
      role: "admin",
      is_active: true,
    },
  });
  localStorage.setItem(
    "abc-shop-v1-management-products",
    JSON.stringify([{ id: "fake-product" }]),
  );
  localStorage.setItem(
    "abc-shop-v1-management-users",
    JSON.stringify([{ id: "fake-admin", role: "admin" }]),
  );
  localStorage.setItem(
    "abc-shop-v1-management-orders",
    JSON.stringify([{ id: "DEMO-ORDER" }]),
  );
  renderSession();
  const button = await screen.findByRole("button", {
    name: "Quản lý",
    exact: true,
  });
  fireEvent.click(button);
  await screen.findByText(
    "Management session: admin; products: 0; orders: 0; users: 0; messages: 0",
  );
});

test("a customer cannot gain an admin button from legacy cached role data", async () => {
  localStorage.setItem("abc-shop-v1-user", JSON.stringify({ role: "admin" }));
  localStorage.setItem(
    "abc-shop-v1-management-session",
    JSON.stringify({ id: "fake-admin" }),
  );
  renderSession();
  await screen.findByText("Verified account: customer");
  expect(
    screen.queryByRole("button", { name: "Quản lý", exact: true }),
  ).toBeNull();
});

test("logout clears the verified user and returns protected routes to login", async () => {
  renderSession();
  fireEvent.click(await screen.findByRole("button", { name: "Test logout" }));
  await screen.findByText("Redirected to login");
  expect(mocks.api.http.hasSession()).toBe(false);
});

test("a temporary restoration failure keeps the session and hides technical details", async () => {
  mocks.api.auth.getProfile.mockRejectedValue({
    status: 503,
    message: "MinIO postgres connection refused",
  });
  renderSession();
  await screen.findByText("Có lỗi xảy ra. Vui lòng thử lại sau.");
  expect(screen.queryByText(/MinIO/)).toBeNull();
  expect(screen.queryByText("Redirected to login")).toBeNull();
  expect(mocks.api.http.hasSession()).toBe(true);
});

test("a rejected saved session is cleared instead of restoring a cached user", async () => {
  mocks.api.auth.getProfile.mockRejectedValue({ status: 401 });
  renderSession();
  await screen.findByText("Redirected to login");
  expect(mocks.api.http.hasSession()).toBe(false);
});

function LiveInboxProbe() {
  const state = useManagement();
  usePolling(state.refreshMessages, { enabled: !!state.session });
  return (
    <div>
      {state.messages.map((message) => (
        <p key={message.id}>{message.text}</p>
      ))}
    </div>
  );
}

test("an incoming customer message appears in an already open admin inbox", async () => {
  vi.useFakeTimers();
  try {
    mocks.api.auth.getProfile.mockResolvedValue({
      data: { id: "admin", role: "admin", email: "admin@example.com" },
    });
    mocks.api.adminChat.list.mockResolvedValue({
      data: [],
      pagination: { total_pages: 1 },
    });
    render(
      <ShopProvider>
        <ManagementProvider>
          <LiveInboxProbe />
        </ManagementProvider>
      </ShopProvider>,
    );
    await act(async () => {});
    expect(screen.queryByText("A new customer message")).toBeNull();
    mocks.api.adminChat.list.mockResolvedValue({
      data: [{ id: "customer", customer: { email: "customer@example.com" } }],
      pagination: { total_pages: 1 },
    });
    mocks.api.adminChat.messages.mockResolvedValue({
      data: [
        {
          id: "message",
          content: "A new customer message",
          sender_role: "customer",
          created_at: "2026-10-19T08:00:00.000Z",
        },
      ],
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(screen.getByText("A new customer message")).toBeTruthy();
    cleanup();
    const calls = mocks.api.adminChat.list.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(mocks.api.adminChat.list).toHaveBeenCalledTimes(calls);
  } finally {
    vi.useRealTimers();
  }
});

function PollingProbe({ action, onError }) {
  usePolling(action, { onError });
  return null;
}

test("polling avoids overlapping requests and retries after a failed request", async () => {
  vi.useFakeTimers();
  try {
    let complete;
    const action = vi.fn().mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const onError = vi.fn();
    const view = render(<PollingProbe action={action} onError={onError} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000);
    });
    expect(action).toHaveBeenCalledTimes(1);
    await act(async () => {
      complete();
    });
    action.mockRejectedValueOnce(new Error("offline"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(onError).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(action).toHaveBeenCalledTimes(3);
    view.unmount();
  } finally {
    vi.useRealTimers();
  }
});

const unreadCustomer = {
  id: "incoming-1",
  content: "Unread customer question",
  sender_role: "customer",
  created_at: "2026-10-19T08:00:00.000Z",
};
function ReadActionsProbe() {
  const state = useManagement();
  return (
    <>
      <button onClick={() => state.markUnread("customer@example.com")}>
        Flag unread
      </button>
      <button onClick={() => state.refreshMessages()}>Reload inbox</button>
      <button
        onClick={() =>
          state.reply("customer@example.com", "Shop answer").catch(() => {})
        }
      >
        Reply test
      </button>
    </>
  );
}
async function renderUnreadInbox() {
  mocks.api.auth.getProfile.mockResolvedValue({
    data: { id: "admin-read", role: "admin", email: "admin@example.com" },
  });
  mocks.api.adminChat.list.mockResolvedValue({
    data: [{ id: "customer", customer: { email: "customer@example.com" } }],
    pagination: { total_pages: 1 },
  });
  mocks.api.adminChat.messages.mockResolvedValue({ data: [unreadCustomer] });
  mocks.api.adminChat.sendMessage.mockResolvedValue({ data: {} });
  const view = render(
    <AntApp>
      <ShopProvider>
        <ManagementProvider>
          <MessagesPage />
          <ReadActionsProbe />
        </ManagementProvider>
      </ShopProvider>
    </AntApp>,
  );
  await screen.findAllByText("Unread customer question");
  return view;
}

test("opening an unread conversation clears its badge, preserves the selected thread under the unread filter, and reads new visible messages", async () => {
  const { container } = await renderUnreadInbox();
  expect(container.querySelector(".mg-conversation-unread")).toBeTruthy();
  fireEvent.click(container.querySelector('[data-filter="unread"]'));
  fireEvent.click(container.querySelector(".mg-conversation"));
  await act(async () => {});
  expect(container.querySelector(".mg-conversation-unread")).toBeNull();
  expect(container.querySelector(".mg-chat-panel").textContent).toContain(
    "Unread customer question",
  );
  fireEvent.click(screen.getByText("Flag unread"));
  expect(container.querySelector(".mg-conversation-unread")).toBeTruthy();
  mocks.api.adminChat.messages.mockResolvedValue({
    data: [
      unreadCustomer,
      { ...unreadCustomer, id: "incoming-2", content: "Another question" },
    ],
  });
  await act(async () => {
    fireEvent.click(screen.getByText("Reload inbox"));
  });
  expect(container.querySelector(".mg-conversation-unread")).toBeNull();
  expect(screen.getByText("Another question")).toBeTruthy();
});

test("a successful shop reply clears existing unread customer messages without marking later arrivals read", async () => {
  const { container } = await renderUnreadInbox();
  expect(container.querySelector(".mg-conversation-unread")).toBeTruthy();
  const sent = {
    id: "outgoing",
    content: "Shop answer",
    sender_role: "shop",
    created_at: "2026-10-19T08:01:00.000Z",
  };
  mocks.api.adminChat.messages.mockResolvedValue({
    data: [unreadCustomer, sent],
  });
  await act(async () => {
    fireEvent.click(screen.getByText("Reply test"));
  });
  expect(mocks.api.adminChat.sendMessage).toHaveBeenCalledWith(
    "customer",
    expect.objectContaining({ content: "Shop answer" }),
  );
  expect(container.querySelector(".mg-conversation-unread")).toBeNull();
  mocks.api.adminChat.messages.mockResolvedValue({
    data: [
      unreadCustomer,
      sent,
      { ...unreadCustomer, id: "incoming-3", content: "Later unread question" },
    ],
  });
  await act(async () => {
    fireEvent.click(screen.getByText("Reload inbox"));
  });
  expect(container.querySelector(".mg-conversation-unread")).toBeTruthy();
});

test("a failed shop reply keeps the customer message unread", async () => {
  const { container } = await renderUnreadInbox();
  mocks.api.adminChat.sendMessage.mockRejectedValue(new Error("offline"));
  await act(async () => {
    fireEvent.click(screen.getByText("Reply test"));
  });
  expect(container.querySelector(".mg-conversation-unread")).toBeTruthy();
});
