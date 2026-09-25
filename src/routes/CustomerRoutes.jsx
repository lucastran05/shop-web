import { Routes, Route } from "react-router-dom";
import CustomerLayout from "../layouts/CustomerLayout";
import Catalog from "../pages/Catalog";
import ProductDetail from "../pages/ProductDetail";
import Cart from "../pages/Cart";
import Checkout from "../pages/Checkout";
import Orders from "../pages/Orders";
import Account from "../pages/Account";
import Auth from "../pages/Auth";
import { Result, Button } from "antd";

export default function CustomerRoutes() {
  return (
    <Routes>
      <Route element={<CustomerLayout />}>
        <Route index element={<Catalog />} />
        <Route path="products/:id" element={<ProductDetail />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="orders" element={<Orders />} />
        <Route path="account" element={<Account />} />
        <Route path="login" element={<Auth />} />
        <Route
          path="*"
          element={
            <Result
              status="404"
              title="Không tìm thấy trang"
              extra={<Button href="/">Về cửa hàng</Button>}
            />
          }
        />
      </Route>
    </Routes>
  );
}
