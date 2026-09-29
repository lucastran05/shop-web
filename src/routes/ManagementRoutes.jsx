import { Link, Route, Routes } from "react-router-dom";
import { Result } from "antd";
import { ManagementProvider } from "../context/ManagementContext";
import { useManagement } from "../hooks/useManagement";
import ManagementLayout from "../layouts/ManagementLayout";
import LoginPage from "../pages/management/LoginPage";
import DashboardPage from "../pages/management/DashboardPage";
import ProductsPage from "../pages/management/ProductsPage";
import CategoriesPage from "../pages/management/CategoriesPage";
import InventoryPage from "../pages/management/InventoryPage";
import OrdersPage from "../pages/management/OrdersPage";
import PaymentsPage from "../pages/management/PaymentsPage";
import MessagesPage from "../pages/management/MessagesPage";
import ReportsPage from "../pages/management/ReportsPage";
import UsersPage from "../pages/management/UsersPage";
import "../styles/management.css";

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
    <ManagementProvider>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route element={<ManagementLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="users" element={<AccountsRoute />} />
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
  );
}
