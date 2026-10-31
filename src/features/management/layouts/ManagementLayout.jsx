import Button from "../components/ManagementButton";
import { useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { Alert, App, Avatar, Drawer, Dropdown, Spin, Tooltip } from "antd";
import { userError } from "../../../shared/utils/userError";
import {
  AppstoreOutlined,
  DatabaseOutlined,
  InboxOutlined,
  MenuOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ExportOutlined,
  MessageOutlined,
  ShoppingOutlined,
  TeamOutlined,
  WalletOutlined,
  LogoutOutlined,
  ShopOutlined,
  SettingOutlined,
  DownOutlined,
  TagsOutlined,
} from "@ant-design/icons";
import { useShopConfig } from "../../../shared/shop/useShopConfig";
import { useManagement } from "../hooks/useManagement";
const navigation = [
  ["", "Tổng quan", AppstoreOutlined],
  ["orders", "Đơn hàng", ShoppingOutlined],
  ["products", "Sản phẩm", InboxOutlined],
  ["categories", "Danh mục", DatabaseOutlined],
  ["inventory", "Kho hàng", ShopOutlined],
  ["payments", "Thanh toán", WalletOutlined],
  ["vouchers", "Voucher", TagsOutlined],
  ["messages", "Tin nhắn", MessageOutlined],
  ["users", "Tài khoản", TeamOutlined],
  ["settings", "Cấu hình", SettingOutlined],
];
const navigationGroups = [
  { label: "Bán hàng", paths: ["orders", "payments", "vouchers"] },
  { label: "Sản phẩm & kho", paths: ["products", "categories", "inventory"] },
  { label: "Khách hàng", paths: ["messages", "users"] },
  { label: "Hệ thống", paths: ["settings"] },
];
export default function ManagementLayout() {
  const shopConfig = useShopConfig();
  const s = useManagement(),
    location = useLocation();
  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { message } = App.useApp();
  const pathname = location.pathname.replace(/\/+$/, "");
  const contentClass =
    {
      "/management/messages": "mg-main-messages",
      "/management/settings": "mg-main-settings",
    }[pathname] || "";
  if (!s.session) return <Navigate to="/management/login" replace />;
  const navLink = ([path, label, Icon]) => (
    <Tooltip key={path} title={label} placement="right">
      <NavLink
        end
        to={`/management${path ? "/" + path : ""}`}
        aria-label={label}
        onClick={() => setMobile(false)}
      >
        <Icon aria-hidden="true" />
        <span>{label}</span>
        {path === "orders" && (
          <small>
            {s.orders.filter((o) => o.status === "Chờ xác nhận").length}
          </small>
        )}
      </NavLink>
    </Tooltip>
  );
  const renderNav = (compact = false) => (
    <>
      <Link className="mg-brand" to="/management" aria-label={shopConfig.name}>
        <span className="mg-brand-mark">
          <img src="/logo/logo.svg" alt="" width="40" height="36" />
        </span>
        <span className="mg-brand-text">
          <span className="mg-brand-name">{shopConfig.name}</span>
          <small>QUẢN LÝ CỬA HÀNG</small>
        </span>
      </Link>
      <nav aria-label="Menu quản trị">
        {navLink(navigation[0])}
        {navigationGroups.map((group) => (
          <details
            className="mg-nav-group"
            key={`${pathname}-${compact}-${group.label}`}
            open={
              compact ||
              group.paths.some((path) => pathname === `/management/${path}`)
            }
          >
            <summary>{group.label}</summary>
            {navigation
              .filter(
                ([path]) =>
                  group.paths.includes(path) &&
                  (s.session.role === "admin" || path !== "users"),
              )
              .map(navLink)}
          </details>
        ))}
      </nav>
    </>
  );
  return (
    <div className={collapsed ? "mg-root mg-sidebar-collapsed" : "mg-root"}>
      <aside className="mg-sidebar" id="management-sidebar">
        {renderNav(collapsed)}
        <Button
          className="mg-sidebar-toggle"
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          aria-expanded={!collapsed}
          aria-controls="management-sidebar"
          onClick={() => setCollapsed((value) => !value)}
        />
      </aside>
      <Drawer
        rootClassName="mg-navigation-drawer"
        title="Điều hướng"
        placement="left"
        open={mobile}
        onClose={() => setMobile(false)}
      >
        {renderNav()}
      </Drawer>
      <div className="mg-workspace">
        <header className="mg-header">
          <div className="mg-header-location">
            <Button
              className="mg-mobile-toggle"
              icon={<MenuOutlined />}
              aria-label="Mở menu"
              onClick={() => setMobile(true)}
            />
          </div>
          <Dropdown
            trigger={["click"]}
            placement="bottomRight"
            menu={{
              items: [
                {
                  key: "storefront",
                  icon: <ExportOutlined />,
                  label: <Link to="/">Xem cửa hàng</Link>,
                },
                { type: "divider" },
                {
                  key: "logout",
                  icon: <LogoutOutlined />,
                  label: "Đăng xuất",
                  danger: true,
                  onClick: () =>
                    s
                      .setSession(null)
                      .catch((error) => message.error(userError(error))),
                },
              ],
            }}
          >
            <button
              type="button"
              className="mg-profile"
              aria-label="Menu tài khoản"
              aria-haspopup="menu"
            >
              <Avatar style={{ background: "#eef5e9", color: "#468432" }}>
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
              <DownOutlined aria-hidden="true" />
            </button>
          </Dropdown>
        </header>
        <main className={`mg-main ${contentClass}`}>
          {s.error && (
            <Alert
              type="error"
              showIcon
              title={s.error}
              action={<Button onClick={s.refresh}>Thử lại</Button>}
            />
          )}
          {s.loading ? <Spin /> : <Outlet />}
        </main>
      </div>
    </div>
  );
}
