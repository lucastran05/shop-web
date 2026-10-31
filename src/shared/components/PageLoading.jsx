import { LoadingOutlined } from "@ant-design/icons";
import { Spin, theme } from "antd";
import { useTranslation } from "react-i18next";

export default function PageLoading() {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  return (
    <Spin
      fullscreen
      indicator={
        <LoadingOutlined
          spin
          style={{ fontSize: 36, color: token.colorPrimary }}
        />
      }
      description={<span role="status">{t("Đang tải…")}</span>}
      styles={{ description: { color: token.colorPrimaryText, marginTop: 16 } }}
    />
  );
}
