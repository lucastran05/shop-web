import { ConfigProvider, App as AntApp } from "antd";
import viVN from "antd/locale/vi_VN";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ManagementApp from "./management/ManagementApp";
import { ShopProvider } from "./context/ShopContext";
import { antThemeConfig } from "./styles/theme";
import CustomerRoutes from "./routes/CustomerRoutes";
import "./styles/global.css";
export default function App() {
  return (
    <ConfigProvider theme={antThemeConfig} locale={viVN}>
      <AntApp>
        <BrowserRouter>
          <ShopProvider>
            <Routes>
              <Route path="/management/*" element={<ManagementApp />} />
              <Route path="*" element={<CustomerRoutes />} />
            </Routes>
          </ShopProvider>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}
