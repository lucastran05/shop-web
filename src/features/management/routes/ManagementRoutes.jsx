import { Link, Navigate, Route, Routes } from "react-router-dom";
import { ConfigProvider, Result } from "antd";
import { ManagementProvider } from "../context/ManagementContext";
import { useManagement } from "../hooks/useManagement";
import ManagementLayout from "../layouts/ManagementLayout";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import ProductsPage from "../pages/ProductsPage";
import CategoriesPage from "../pages/CategoriesPage";
import InventoryPage from "../pages/InventoryPage";
import CutoutPage from "../pages/CutoutPage";
import OrdersPage from "../pages/OrdersPage";
import PaymentsPage from "../pages/PaymentsPage";
import MessagesPage from "../pages/MessagesPage";
import SettingsPage from "../pages/SettingsPage";
import VouchersPage from "../pages/VouchersPage";
import UsersPage from "../pages/UsersPage";
import "../styles/management.css";
import "../styles/admin-botanical.css";
import { adminTheme } from "../styles/adminTheme";

function AccountsRoute() {
  return useManagement().session?.role === "admin" ? (
    <UsersPage />
  ) : (
    <Result
      status="403"
      title="Bạn không có quyền truy cập"
      extra={<Link to="/management">Về tổng quan</Link>}
    />
  );
}
export default function ManagementRoutes() {
  return (
    <ConfigProvider theme={adminTheme}>
      <ManagementProvider>
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route element={<ManagementLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="cutout" element={<CutoutPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="vouchers" element={<VouchersPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route
              path="reports"
              element={<Navigate to="/management" replace />}
            />
            <Route path="users" element={<AccountsRoute />} />
            <Route path="settings" element={<SettingsPage />} />
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
