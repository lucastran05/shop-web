import { ReloadOutlined } from "@ant-design/icons";
import { Button, Result } from "antd";
import { useTranslation } from "react-i18next";
import { userError } from "../utils/userError";

export default function RequestError({ error, onRetry }) {
  const { t } = useTranslation();
  return (
    <Result
      className="request-error"
      icon={
        <img src="/logo/logo.svg" alt="Bloomora" width="112" height="100" />
      }
      title={t(userError(error))}
      subTitle={t("Không thể tải dữ liệu lúc này. Thử lại để tiếp tục.")}
      extra={
        <Button type="primary" icon={<ReloadOutlined />} onClick={onRetry}>
          {t("Thử lại")}
        </Button>
      }
    />
  );
}
