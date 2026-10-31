import { LoadingOutlined } from "@ant-design/icons";
import { Spin } from "antd";
import { useTranslation } from "react-i18next";

export default function PageLoading() {
  const { t } = useTranslation();
  return (
    <Spin
      fullscreen
      indicator={
        <LoadingOutlined spin style={{ fontSize: 36, color: "#468432" }} />
      }
      description={<span role="status">{t("Đang tải…")}</span>}
      styles={{ description: { color: "#526c46", marginTop: 16 } }}
    />
  );
}
