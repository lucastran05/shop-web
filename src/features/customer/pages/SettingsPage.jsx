import { Form, Select } from "antd";
import { useTranslation } from "react-i18next";
import { usePreferences } from "../../../shared/preferences/usePreferences";
import { getDeviceTimeZone } from "../../../shared/utils/format";

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { timeZone, setTimeZone } = usePreferences();
  return (
    <div className="page">
      <h1>{t("Cài đặt")}</h1>
      <div className="panel" style={{ maxWidth: 560 }}>
        <Form layout="vertical">
          <Form.Item label={t("Ngôn ngữ")} htmlFor="settings-language">
            <Select
              aria-label={t("Ngôn ngữ")}
              id="settings-language"
              style={{ width: "100%" }}
              value={i18n.resolvedLanguage === "en" ? "en" : "vi"}
              onChange={(lng) => i18n.changeLanguage(lng)}
              options={[
                { value: "vi", label: "VI" },
                { value: "en", label: "EN" },
              ]}
            />
          </Form.Item>
          <Form.Item label={t("Múi giờ hiển thị")} htmlFor="settings-timezone">
            <Select
              aria-label={t("Múi giờ hiển thị")}
              id="settings-timezone"
              style={{ width: "100%" }}
              value={timeZone}
              onChange={setTimeZone}
              showSearch
              options={[
                ...new Set([
                  getDeviceTimeZone(),
                  timeZone,
                  "Asia/Ho_Chi_Minh",
                  "Asia/Bangkok",
                  "Asia/Tokyo",
                  "Europe/London",
                  "America/New_York",
                  "America/Los_Angeles",
                  "UTC",
                ]),
              ].map((z) => ({ value: z, label: z }))}
            />
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
