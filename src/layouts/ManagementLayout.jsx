import Button from "../components/management/ManagementButton";
import { useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { Avatar, Drawer } from "antd";
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
  LogoutOutlined,
  ShopOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useShopConfig } from "../hooks/useShopConfig";
import { useManagement } from "../hooks/useManagement";
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
  ["settings", "Cấu hình", SettingOutlined],
];
export default function ManagementLayout() {
  const shopConfig = useShopConfig();
  const s = useManagement(),
    location = useLocation();
  const [mobile, setMobile] = useState(false);
  if (!s.session) return <Navigate to="/management/login" replace />;
  const current = navigation.find(
    ([path]) =>
      location.pathname.replace(/\/+$/, "") ===
      `/management${path ? "/" + path : ""}`,
  );
  const nav = (
    <>
      <Link className="mg-brand" to="/management">
        <span className="mg-brand-mark">
          <ShopOutlined />
        </span>
        <span className="mg-brand-text">
          <span className="mg-brand-name">{shopConfig.name}</span>
          <small>QUẢN LÝ CỬA HÀNG</small>
        </span>
      </Link>
      <nav aria-label="Menu quản trị">
        {navigation
          .filter(
            ([path]) => s.session.role === "admin" || !["users"].includes(path),
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
        rootClassName="mg-navigation-drawer"
        title="Điều hướng"
        placement="left"
        open={mobile}
        onClose={() => setMobile(false)}
      >
        {nav}
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
            <div className="mg-breadcrumb">
              <span className="mg-breadcrumb-prefix">
                Không gian quản lý <span>/</span>
              </span>
              <h1>{current?.[1] || "Trang quản trị"}</h1>
            </div>
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
        <main
          className={`mg-main ${location.pathname.replace(/\/+$/, "") === "/management/messages" ? "mg-main-messages" : ""}`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
