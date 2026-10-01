import { ConfigProvider, App as AntApp } from "antd";
import "./utils/i18n";
import { useTranslation } from "react-i18next";
import { PreferencesProvider } from "./context/PreferencesProvider";
import enUS from "antd/locale/en_US";
import viVN from "antd/locale/vi_VN";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { ShopProvider } from "./context/ShopContext";
import { antThemeConfig } from "./styles/theme";
import "./styles/global.css";
export default function App() {
  const { i18n } = useTranslation();
  return (
    <ConfigProvider
      theme={antThemeConfig}
      locale={i18n.language === "en" ? enUS : viVN}
    >
      <AntApp>
        <PreferencesProvider>
          <BrowserRouter>
            <ShopProvider>
              <AppRoutes />
            </ShopProvider>
          </BrowserRouter>
        </PreferencesProvider>
      </AntApp>
    </ConfigProvider>
  );
}
