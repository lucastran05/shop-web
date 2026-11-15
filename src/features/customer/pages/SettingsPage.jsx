import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, App, Button, Form, Input, Select } from "antd";
import { useTranslation } from "react-i18next";
import { usePreferences } from "../../../shared/preferences/usePreferences";
import { getDeviceTimeZone } from "../../../shared/utils/format";
import { useShop } from "../../../shared/shop/useShop";
import { api } from "../../../shared/api";
import { userError } from "../../../shared/utils/userError";

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { timeZone, setTimeZone, catalogPreferences, setCatalogPreferences } =
    usePreferences();
  const { user, setUser } = useShop();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [passwordForm] = Form.useForm();
  const [saving, setSaving] = useState(false);
  async function changePassword(values) {
    if (saving) return;
    setSaving(true);
    try {
      await api.auth.changePassword({
        current_password: values.current,
        new_password: values.next,
        new_password_confirmation: values.confirm,
      });
      passwordForm.resetFields();
      setUser(null);
      message.success(t("Đổi mật khẩu thành công. Vui lòng đăng nhập lại."));
      navigate("/login?next=/settings", { replace: true });
    } catch (error) {
      message.error(t(userError(error)));
    } finally {
      setSaving(false);
    }
  }
  const language = i18n.resolvedLanguage === "en" ? "en" : "vi";
  const choice = (value, current, onPick, label) => (
    <button
      type="button"
      role="radio"
      aria-checked={value === current}
      key={value}
      onClick={() => onPick(value)}
    >
      {label}
    </button>
  );
  return (
    <div className="page account-page settings-page bt-settings">
      <header className="bt-page-head">
        <h1>{t("Cài đặt")}</h1>
        <p>{t("Các tùy chọn hiển thị được lưu trên trình duyệt này.")}</p>
      </header>
      <div className="bt-settings-layout">
        <nav className="bt-settings-nav" aria-label={t("Mục cài đặt")}>
          <a href="#settings-display-heading">{t("Ngôn ngữ & thời gian")}</a>
          <a href="#settings-shopping-heading">{t("Tùy chọn mua sắm")}</a>
          <a href="#settings-password-heading">{t("Đổi mật khẩu")}</a>
        </nav>
        <div className="bt-settings-body">
          <section
            className="bt-settings-section"
            aria-labelledby="settings-display-heading"
          >
            <h2 id="settings-display-heading">{t("Ngôn ngữ & thời gian")}</h2>
            <div className="bt-setting-row">
              <div>
                <h3>{t("Ngôn ngữ")}</h3>
                <p>{t("Đổi ngay, không cần tải lại trang.")}</p>
              </div>
              <div
                className="bt-choice"
                role="radiogroup"
                aria-label={t("Ngôn ngữ")}
              >
                {choice(
                  "vi",
                  language,
                  (lng) => i18n.changeLanguage(lng),
                  "Tiếng Việt",
                )}
                {choice(
                  "en",
                  language,
                  (lng) => i18n.changeLanguage(lng),
                  "English",
                )}
              </div>
            </div>
            <div className="bt-setting-row">
              <div>
                <h3>{t("Múi giờ hiển thị")}</h3>
                <p>{t("Dùng cho giờ đặt hàng, thông báo và tin nhắn.")}</p>
              </div>
              <div className="bt-setting-control">
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
                <Button
                  type="link"
                  onClick={() => setTimeZone(getDeviceTimeZone())}
                >
                  {t("Dùng múi giờ thiết bị")}
                </Button>
              </div>
            </div>
          </section>

          <section
            className="bt-settings-section"
            aria-labelledby="settings-shopping-heading"
          >
            <h2 id="settings-shopping-heading">{t("Tùy chọn mua sắm")}</h2>
            <div className="bt-setting-row">
              <div>
                <h3>{t("Sắp xếp mặc định")}</h3>
                <p>{t("Thứ tự sản phẩm khi bạn mở cửa hàng.")}</p>
              </div>
              <div
                className="bt-choice"
                role="radiogroup"
                aria-label={t("Sắp xếp mặc định")}
              >
                {[
                  ["popular", t("Nổi bật nhất")],
                  ["low", t("Giá tăng dần")],
                  ["high", t("Giá giảm dần")],
                ].map(([value, label]) =>
                  choice(
                    value,
                    catalogPreferences.defaultSort,
                    (defaultSort) =>
                      setCatalogPreferences({
                        ...catalogPreferences,
                        defaultSort,
                      }),
                    label,
                  ),
                )}
              </div>
            </div>
            <div className="bt-setting-row">
              <div>
                <h3>{t("Số sản phẩm mỗi trang")}</h3>
              </div>
              <div
                className="bt-choice"
                role="radiogroup"
                aria-label={t("Số sản phẩm mỗi trang")}
              >
                {[6, 12, 24].map((value) =>
                  choice(
                    value,
                    catalogPreferences.pageSize,
                    (pageSize) =>
                      setCatalogPreferences({
                        ...catalogPreferences,
                        pageSize,
                      }),
                    t("{{count}} sản phẩm", { count: value }),
                  ),
                )}
              </div>
            </div>
          </section>

          <section
            className="bt-settings-section"
            aria-labelledby="settings-password-heading"
          >
            <h2 id="settings-password-heading">{t("Đổi mật khẩu")}</h2>
            {user ? (
              <Form
                className="bt-password-form"
                form={passwordForm}
                layout="vertical"
                onFinish={changePassword}
                disabled={saving}
              >
                <Form.Item
                  name="current"
                  label={t("Mật khẩu hiện tại")}
                  rules={[
                    { required: true, message: t("Nhập mật khẩu hiện tại") },
                  ]}
                >
                  <Input.Password autoComplete="current-password" />
                </Form.Item>
                <Form.Item
                  name="next"
                  label={t("Mật khẩu mới")}
                  rules={[
                    { required: true, message: t("Nhập mật khẩu mới") },
                    { min: 8, message: t("Tối thiểu 8 ký tự") },
                  ]}
                >
                  <Input.Password autoComplete="new-password" />
                </Form.Item>
                <Form.Item
                  name="confirm"
                  label={t("Nhập lại mật khẩu mới")}
                  dependencies={["next"]}
                  rules={[
                    { required: true, message: t("Nhập lại mật khẩu") },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        return !value || value === getFieldValue("next")
                          ? Promise.resolve()
                          : Promise.reject(new Error(t("Mật khẩu không khớp")));
                      },
                    }),
                  ]}
                >
                  <Input.Password autoComplete="new-password" />
                </Form.Item>
                <p className="bt-hint-left">
                  {t("Đổi xong bạn sẽ cần đăng nhập lại.")}
                </p>
                <Button type="primary" htmlType="submit" loading={saving}>
                  {t("Đổi mật khẩu")}
                </Button>
              </Form>
            ) : (
              <Alert
                type="info"
                showIcon
                title={t("Đăng nhập để đổi mật khẩu.")}
                action={
                  <Link to="/login?next=/settings">{t("Đăng nhập")}</Link>
                }
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
