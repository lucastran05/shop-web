import { userError } from "../utils/userError";
import { useTranslation } from "react-i18next";
import { shopConfig } from "../constants/shop";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Form, Input, Tabs, App } from "antd";
import { useShop } from "../hooks/useShop";
import { api } from "../services/api";
export default function Auth() {
  const { t } = useTranslation();
  const [tab, setTab] = useState("login"),
    [loading, setLoading] = useState(false),
    { setUser } = useShop(),
    navigate = useNavigate(),
    [params] = useSearchParams(),
    { message } = App.useApp();
  async function submit(values) {
    setLoading(true);
    try {
      const email = values.email.trim().toLowerCase();
      let user;
      if (tab === "register") {
        const registered = await api.auth.register({
          name: values.name.trim(),
          email,
          password: values.password,
          password_confirmation: values.confirmPassword,
        });
        if (registered.data.accessToken && registered.data.refreshToken) {
          user = registered.data.user ?? registered.data;
        } else {
          user = (await api.auth.login({ email, password: values.password }))
            .data.user;
        }
      } else {
        user = (await api.auth.login({ email, password: values.password })).data
          .user;
      }
      user = (await api.auth.getProfile()).data;
      setUser(user);
      message.success(
        t(
          tab === "register"
            ? "Đăng ký tài khoản thành công"
            : "Đăng nhập thành công",
        ),
      );
      const next = params.get("next");
      navigate(
        next && next.startsWith("/") && !next.startsWith("//")
          ? next
          : "/account",
        { replace: true },
      );
    } catch (error) {
      message.error(
        error?.status === 401
          ? t("Email hoặc mật khẩu không chính xác")
          : userError(error),
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="auth-page">
      <div className="auth-art">
        <h1>{shopConfig.name}</h1>
        <p>{t("Đăng nhập để đặt hàng và theo dõi đơn hàng của bạn.")}</p>
      </div>
      <div className="auth-form">
        <h2>{t("Tài khoản khách hàng")}</h2>
        <p className="muted">
          {t("Lưu những lựa chọn và theo dõi đơn hàng của bạn.")}
        </p>
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            { key: "login", label: t("Đăng nhập") },
            { key: "register", label: t("Đăng ký") },
          ]}
        />
        <Form key={tab} layout="vertical" onFinish={submit}>
          {tab === "register" && (
            <Form.Item
              name="name"
              label={t("Họ và tên")}
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: t("Nhập họ và tên"),
                },
              ]}
            >
              <Input maxLength={80} />
            </Form.Item>
          )}
          <Form.Item
            name="email"
            label={t("Email")}
            rules={[
              { required: true, message: t("Nhập email") },
              { type: "email", message: t("Email chưa hợp lệ") },
            ]}
          >
            <Input placeholder={t("ban@example.com")} />
          </Form.Item>
          <Form.Item
            name="password"
            label={t("Mật khẩu")}
            rules={[
              { required: true, message: t("Nhập mật khẩu") },
              { min: 6, message: t("Tối thiểu 6 ký tự") },
            ]}
          >
            <Input.Password autoComplete="off" />
          </Form.Item>
          {tab === "register" && (
            <Form.Item
              name="confirmPassword"
              label={t("Xác nhận mật khẩu")}
              dependencies={["password"]}
              rules={[
                { required: true, message: t("Nhập lại mật khẩu") },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    return !value || value === getFieldValue("password")
                      ? Promise.resolve()
                      : Promise.reject(new Error(t("Mật khẩu không khớp")));
                  },
                }),
              ]}
            >
              <Input.Password autoComplete="off" />
            </Form.Item>
          )}
          <Button htmlType="submit" type="primary" block loading={loading}>
            {t(tab === "login" ? "Đăng nhập" : "Tạo tài khoản")}
          </Button>
        </Form>
      </div>
    </div>
  );
}
