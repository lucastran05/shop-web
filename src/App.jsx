import { ConfigProvider, App as AntApp } from "antd";
import viVN from "antd/locale/vi_VN";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { ShopProvider } from "./context/ShopContext";
import { antThemeConfig } from "./styles/theme";
import "./styles/global.css";
export default function App() {
  return (
    <ConfigProvider theme={antThemeConfig} locale={viVN}>
      <AntApp>
        <BrowserRouter>
          <ShopProvider>
            <AppRoutes />
          </ShopProvider>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}
