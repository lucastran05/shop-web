import { useState } from "react";
import { Alert, App, Button, Form, Input, Space } from "antd";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../../shared/api";
import { userError } from "../../../shared/utils/userError";

export default function PasswordRecoveryPage({ reset = false }) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { hash } = useLocation();
  const [params] = useSearchParams();
  const token = new URLSearchParams(hash.slice(1)).get("token") || "";
  const validToken = /^[a-f0-9]{64}$/.test(token);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const loginUrl =
    params.get("from") === "management" ? "/management/login" : "/login";

  async function submit(values) {
    setLoading(true);
    setError("");
    try {
      if (reset) {
        await api.auth.resetPassword({ token, ...values });
        setDone(true);
        message.success(
          `${t("Đặt lại mật khẩu thành công")}. ${t("Các phiên đăng nhập cũ đã được thu hồi. Hãy đăng nhập bằng mật khẩu mới.")}`,
          8,
        );
      } else {
        await api.auth.forgotPassword({
          email: values.email.trim().toLowerCase(),
        });
        setSent(true);
        message.success(t("Kiểm tra email để đặt lại mật khẩu."));
      }
    } catch (failure) {
      setError(
        [400, 429].includes(failure?.status)
          ? failure.message
          : userError(failure),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-art">
        <h1>
          <img
            className="auth-logo"
            src="/logo/logo.svg"
            alt="Bloomora"
            width="800"
            height="800"
          />
        </h1>
      </div>
      <div className="auth-form">
        <h2>{t(reset ? "Đặt lại mật khẩu" : "Quên mật khẩu")}</h2>
        <p className="muted">
          {t(
            reset
              ? "Nhập mật khẩu mới cho tài khoản của bạn."
              : "Nhập email đăng ký để nhận liên kết đặt lại mật khẩu.",
          )}
        </p>
        <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
          {error && <Alert type="error" role="alert" title={t(error)} />}
          {!done &&
            (reset && !validToken ? (
              <Alert
                type="warning"
                role="alert"
                title={t(
                  "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn",
                )}
              />
            ) : (
              <Form layout="vertical" onFinish={submit}>
                {!reset ? (
                  <Form.Item
                    name="email"
                    label={t("Email")}
                    rules={[
                      { required: true, message: t("Nhập email") },
                      {
                        type: "email",
                        transform: (value) => value?.trim(),
                        message: t("Email chưa hợp lệ"),
                      },
                    ]}
                  >
                    <Input
                      type="email"
                      autoComplete="email"
                      maxLength={255}
                      placeholder="ban@example.com"
                    />
                  </Form.Item>
                ) : (
                  <>
                    <Form.Item
                      name="password"
                      label={t("Mật khẩu mới")}
                      rules={[
                        { required: true, message: t("Nhập mật khẩu") },
                        { min: 6, message: t("Tối thiểu 6 ký tự") },
                        {
                          validator: (_, value) =>
                            !value ||
                            new TextEncoder().encode(value).length <= 72
                              ? Promise.resolve()
                              : Promise.reject(
                                  new Error(
                                    t("Mật khẩu không được vượt quá 72 byte"),
                                  ),
                                ),
                        },
                      ]}
                    >
                      <Input.Password autoComplete="new-password" />
                    </Form.Item>
                    <Form.Item
                      name="password_confirmation"
                      label={t("Xác nhận mật khẩu")}
                      dependencies={["password"]}
                      rules={[
                        { required: true, message: t("Nhập lại mật khẩu") },
                        ({ getFieldValue }) => ({
                          validator: (_, value) =>
                            !value || value === getFieldValue("password")
                              ? Promise.resolve()
                              : Promise.reject(
                                  new Error(t("Mật khẩu không khớp")),
                                ),
                        }),
                      ]}
                    >
                      <Input.Password autoComplete="new-password" />
                    </Form.Item>
                  </>
                )}
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                >
                  {t(
                    reset
                      ? "Lưu mật khẩu mới"
                      : sent
                        ? "Gửi lại liên kết"
                        : "Gửi liên kết đặt lại mật khẩu",
                  )}
                </Button>
              </Form>
            ))}
          {reset && !done && (
            <Link to="/forgot-password">{t("Yêu cầu liên kết mới")}</Link>
          )}
          <Link to={loginUrl}>{t("Quay lại đăng nhập")}</Link>
          {reset && done && (
            <Link to="/management/login">{t("Đăng nhập quản lý")}</Link>
          )}
        </Space>
      </div>
    </div>
  );
}
