import { useTranslation } from "react-i18next";
import ShopInfoPage from "../pages/ShopInfoPage.jsx";
import { Routes, Route, Navigate } from "react-router-dom";
import CustomerLayout from "../layouts/CustomerLayout";
import CatalogPage from "../pages/CatalogPage.jsx";
import ProductDetailPage from "../pages/ProductDetailPage.jsx";
import CartPage from "../pages/CartPage.jsx";
import CustomBouquetPage from "../pages/CustomBouquetPage.jsx";
import CheckoutPage from "../pages/CheckoutPage.jsx";
import OrdersPage from "../pages/OrdersPage.jsx";
import AccountPage from "../pages/AccountPage.jsx";
import SettingsPage from "../pages/SettingsPage.jsx";
import AuthPage from "../pages/AuthPage.jsx";
import PasswordRecoveryPage from "../pages/PasswordRecoveryPage.jsx";
import { Result, Button } from "antd";

export default function CustomerRoutes() {
  const { t } = useTranslation();
  return (
    <Routes>
      <Route element={<CustomerLayout />}>
        <Route index element={<CatalogPage />} />
        <Route
          path="identify-flower"
          element={<Navigate to="/?identify=flower" replace />}
        />
        <Route path="shop-info" element={<ShopInfoPage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="custom-bouquet" element={<CustomBouquetPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="login" element={<AuthPage />} />
        <Route
          path="forgot-password"
          element={<PasswordRecoveryPage key="forgot" />}
        />
        <Route
          path="reset-password"
          element={<PasswordRecoveryPage key="reset" reset />}
        />
        <Route
          path="*"
          element={
            <Result
              status="404"
              title={t("Không tìm thấy trang")}
              extra={<Button href="/">{t("Về cửa hàng")}</Button>}
            />
          }
        />
      </Route>
    </Routes>
  );
}
