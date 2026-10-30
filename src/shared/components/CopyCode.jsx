import { App, Button, Tooltip } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

export default function CopyCode({ value }) {
  const { message } = App.useApp();
  const { t } = useTranslation();
  return value ? (
    <Tooltip title={t("Sao chép mã")}><Button
      type="text"
      icon={<CopyOutlined />}
      aria-label={t("Sao chép mã")}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(String(value));
          message.success(t("Đã sao chép mã"));
        } catch {
          message.error(t("Không thể sao chép. Vui lòng thử lại."));
        }
      }}
    /></Tooltip>
  ) : (
    "—"
  );
}
