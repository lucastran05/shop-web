import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, App, Button, Form, Input, Select } from "antd";
import {
  GlobalOutlined,
  ShoppingOutlined,
  LockOutlined,
} from "@ant-design/icons";
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
  return (
    <div className="page account-page settings-page">
      <h1>{t("Cài đặt")}</h1>
      <p className="muted">
        {t("Các tùy chọn hiển thị được lưu trên trình duyệt này.")}
      </p>
      <div className="account-panel">
        <section
          className="account-section"
          aria-labelledby="settings-display-heading"
        >
          <h2 id="settings-display-heading">
            <GlobalOutlined aria-hidden="true" />
            {t("Ngôn ngữ & thời gian")}
          </h2>
          <div className="account-section-content">
            <Form layout="vertical">
              <Form.Item label={t("Ngôn ngữ")} htmlFor="settings-language">
                <Select
                  aria-label={t("Ngôn ngữ")}
                  id="settings-language"
                  style={{ width: "100%" }}
                  value={i18n.resolvedLanguage === "en" ? "en" : "vi"}
                  onChange={(lng) => i18n.changeLanguage(lng)}
                  options={[
                    { value: "vi", label: "Tiếng Việt" },
                    { value: "en", label: "English" },
                  ]}
                />
              </Form.Item>
              <Form.Item
                label={t("Múi giờ hiển thị")}
                htmlFor="settings-timezone"
              >
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
              <Button
                type="link"
                onClick={() => setTimeZone(getDeviceTimeZone())}
              >
                {t("Dùng múi giờ thiết bị")}
              </Button>
            </Form>
          </div>
        </section>
        <section
          className="account-section"
          aria-labelledby="settings-shopping-heading"
        >
          <h2 id="settings-shopping-heading">
            <ShoppingOutlined aria-hidden="true" />
            {t("Tùy chọn mua sắm")}
          </h2>
          <div className="account-section-content">
            <Form layout="vertical">
              <Form.Item label={t("Sắp xếp mặc định")} htmlFor="settings-sort">
                <Select
                  id="settings-sort"
                  value={catalogPreferences.defaultSort}
                  onChange={(defaultSort) =>
                    setCatalogPreferences({
                      ...catalogPreferences,
                      defaultSort,
                    })
                  }
                  options={[
                    { value: "popular", label: t("Nổi bật nhất") },
                    { value: "low", label: t("Giá tăng dần") },
                    { value: "high", label: t("Giá giảm dần") },
                  ]}
                />
              </Form.Item>
              <Form.Item
                label={t("Số sản phẩm mỗi trang")}
                htmlFor="settings-page-size"
              >
                <Select
                  id="settings-page-size"
                  value={catalogPreferences.pageSize}
                  onChange={(pageSize) =>
                    setCatalogPreferences({ ...catalogPreferences, pageSize })
                  }
                  options={[6, 12, 24].map((value) => ({
                    value,
                    label: t("{{count}} sản phẩm", { count: value }),
                  }))}
                />
              </Form.Item>
            </Form>
          </div>
        </section>
        <section
          className="account-section"
          aria-labelledby="settings-password-heading"
        >
          <h2 id="settings-password-heading">
            <LockOutlined aria-hidden="true" />
            {t("Đổi mật khẩu")}
          </h2>
          <div className="account-section-content">
            {user ? (
              <>
                <Form
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
                            : Promise.reject(
                                new Error(t("Mật khẩu không khớp")),
                              );
                        },
                      }),
                    ]}
                  >
                    <Input.Password autoComplete="new-password" />
                  </Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<LockOutlined />}
                    loading={saving}
                  >
                    {t("Đổi mật khẩu")}
                  </Button>
                </Form>
              </>
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
          </div>
        </section>
      </div>
    </div>
  );
}
