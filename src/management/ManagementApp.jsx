import { useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  App,
  Avatar,
  Button,
  ConfigProvider,
  Drawer,
  Result,
  Form,
  Input,
} from "antd";
import {
  AppstoreOutlined,
  BarChartOutlined,
  DatabaseOutlined,
  InboxOutlined,
  MenuOutlined,
  MessageOutlined,
  ShoppingOutlined,
  TeamOutlined,
  WalletOutlined,
  SafetyOutlined,
  LogoutOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import { antThemeConfig } from "../styles/theme";
import { shopConfig } from "../constants/shop";
import { ManagementProvider } from "./store";
import { useManagement } from "./context";
import { DashboardPage, ReportsPage } from "./pages/Overview";
import { ProductsPage, CategoriesPage, InventoryPage } from "./pages/Catalog";
import { OrdersPage, PaymentsPage } from "./pages/Orders";
import { MessagesPage, UsersPage, RolesPage } from "./pages/People";
import "./management.css";

const navigation = [
  ["", "Tổng quan", AppstoreOutlined],
  ["orders", "Đơn hàng", ShoppingOutlined],
  ["products", "Sản phẩm", InboxOutlined],
  ["categories", "Danh mục", DatabaseOutlined],
  ["inventory", "Kho hàng", ShopOutlined],
  ["payments", "Thanh toán", WalletOutlined],
  ["messages", "Tin nhắn", MessageOutlined],
  ["reports", "Báo cáo", BarChartOutlined],
  ["users", "Tài khoản", TeamOutlined],
  ["roles", "Phân quyền", SafetyOutlined],
];
function Login() {
  const s = useManagement(),
    navigate = useNavigate(),
    { message } = App.useApp();
  if (s.session) return <Navigate to="/management" replace />;
  function submit(values) {
    const email = values.email.trim().toLowerCase();
    const user = s.users.find((user) => user.email.toLowerCase() === email);
    if (!user || !user.active || !["admin", "manager"].includes(user.role)) {
      message.error("Tài khoản không có quyền truy cập trang quản lý.");
      return;
    }
    // Frontend-only session, following the Customer form. Password is not stored.
    s.setSession({ id: user.id });
    navigate("/management", { replace: true });
  }
  return (
    <div className="mg-login">
      <div className="mg-login-card">
        <span className="mg-brand-mark">
          <ShopOutlined />
        </span>
        <p className="mg-eyebrow">{shopConfig.name}</p>
        <h1>Đăng nhập quản lý</h1>
        <Form layout="vertical" onFinish={submit}>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Nhập email" },
              { type: "email", message: "Email chưa hợp lệ" },
            ]}
          >
            <Input autoComplete="username" placeholder="Nhập email" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[
              { required: true, message: "Nhập mật khẩu" },
              { min: 6, message: "Tối thiểu 6 ký tự" },
            ]}
          >
            <Input.Password autoComplete="off" placeholder="Nhập mật khẩu" />
          </Form.Item>
          <Button block htmlType="submit" type="primary">
            Đăng nhập
          </Button>
        </Form>
        <Link to="/">← Về cửa hàng</Link>
      </div>
    </div>
  );
}
function Layout() {
  const s = useManagement(),
    location = useLocation();
  const [mobile, setMobile] = useState(false);
  if (!s.session) return <Navigate to="/management/login" replace />;
  const current = navigation.find(
    ([path]) => location.pathname === `/management${path ? "/" + path : ""}`,
  );
  const nav = (
    <>
      <Link className="mg-brand" to="/management">
        <span className="mg-brand-mark">
          <ShopOutlined />
        </span>
        <span>
          {shopConfig.name}
          <small>QUẢN LÝ CỬA HÀNG</small>
        </span>
      </Link>
      <p className="mg-nav-label">ĐIỀU HÀNH CỬA HÀNG</p>
      <nav aria-label="Menu quản trị">
        {navigation
          .filter(
            ([path]) =>
              s.session.role === "admin" || !["users", "roles"].includes(path),
          )
          .map(([path, label, Icon]) => (
            <NavLink
              key={path}
              end
              to={`/management${path ? "/" + path : ""}`}
              onClick={() => setMobile(false)}
            >
              <Icon />
              <span>{label}</span>
              {path === "orders" && (
                <small>
                  {s.orders.filter((o) => o.status === "Chờ xác nhận").length}
                </small>
              )}
            </NavLink>
          ))}
      </nav>
      <div className="mg-sidebar-bottom">
        <Link to="/">↗ Xem cửa hàng</Link>
      </div>
    </>
  );
  return (
    <div className="mg-root">
      <aside className="mg-sidebar">{nav}</aside>
      <Drawer
        title="Điều hướng"
        placement="left"
        open={mobile}
        onClose={() => setMobile(false)}
      >
        {nav}
      </Drawer>
      <div className="mg-workspace">
        <header className="mg-header">
          <div>
            <Button
              className="mg-mobile-toggle"
              icon={<MenuOutlined />}
              aria-label="Mở menu"
              onClick={() => setMobile(true)}
            />
            <span className="mg-breadcrumb">
              Không gian quản lý <span>/</span>{" "}
              <strong>{current?.[1] || "Trang quản trị"}</strong>
            </span>
          </div>
          <div className="mg-profile">
            <Avatar style={{ background: "#e6f4ff", color: "#1677ff" }}>
              {s.session.name?.trim().charAt(0).toUpperCase()}
            </Avatar>
            <span>
              <strong>{s.session.name}</strong>
              <small>
                {s.session.role === "admin"
                  ? "Quản trị viên"
                  : "Quản lý cửa hàng"}
              </small>
            </span>
            <Button
              type="text"
              aria-label="Đăng xuất quản trị"
              icon={<LogoutOutlined />}
              onClick={() => s.setSession(null)}
            />
          </div>
        </header>
        <main className="mg-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
function AdminOnly({ children }) {
  return useManagement().session?.role === "admin" ? (
    children
  ) : (
    <Result
      status="403"
      title="Bạn không có quyền truy cập"
      subTitle="Chức năng này dành cho Admin."
      extra={<Link to="/management">Về tổng quan</Link>}
    />
  );
}
export default function ManagementApp() {
  return (
    <ConfigProvider theme={antThemeConfig}>
      <ManagementProvider>
        <Routes>
          <Route path="login" element={<Login />} />
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route
              path="users"
              element={
                <AdminOnly>
                  <UsersPage />
                </AdminOnly>
              }
            />
            <Route
              path="roles"
              element={
                <AdminOnly>
                  <RolesPage />
                </AdminOnly>
              }
            />
            <Route
              path="*"
              element={
                <Result
                  status="404"
                  title="Không tìm thấy trang"
                  extra={<Link to="/management">Về tổng quan</Link>}
                />
              }
            />
          </Route>
        </Routes>
      </ManagementProvider>
    </ConfigProvider>
  );
}
