import { useTranslation } from "react-i18next";
import { shopConfig } from "../constants/shop";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Button, Form, Input, Tabs, App } from "antd";
import { useShop } from "../hooks/useShop";
import { useSaved } from "../hooks/useSaved";
import { initialUsers } from "../constants/management";
import { matchesPassword } from "../utils/password";
export default function Auth() {
  const { t } = useTranslation();
  const [managedUsers] = useSaved("management-users", initialUsers);
  const [tab, setTab] = useState("login"),
    { setUser, profiles } = useShop(),
    navigate = useNavigate(),
    [params] = useSearchParams(),
    { message } = App.useApp();
  async function submit(values) {
    const managed = managedUsers.find(
      (user) => user.email === values.email.trim().toLowerCase(),
    );
    if (managed) {
      if (!managed.active) return message.error("Tài khoản đã bị khóa.");
      if (tab === "register") return message.error("Email đã tồn tại.");
      if (managed.credential) {
        try {
          if (!(await matchesPassword(values.password, managed.credential)))
            return message.error("Mật khẩu không đúng.");
        } catch {
          return message.error(
            "Không thể kiểm tra mật khẩu. Vui lòng thử lại.",
          );
        }
      }
    }
    setUser(
      profiles[values.email.trim().toLowerCase()] || {
        name: values.name || values.email.split("@")[0],
        email: values.email.trim().toLowerCase(),
        phone: "",
        address: "",
      },
    );
    message.success(t("Đã vào phiên Customer demo"));
    const next = params.get("next");
    navigate(
      next && next.startsWith("/") && !next.startsWith("//")
        ? next
        : "/account",
      { replace: true },
    );
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
        <Alert
          type="info"
          showIcon
          title={t("Phiên trải nghiệm giao diện")}
          description={t(
            "Chưa có API xác thực. Email chỉ dùng để tạo hồ sơ demo trên trình duyệt; không nhập mật khẩu thật.",
          )}
        />
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
            label={t("Mật khẩu demo (không lưu)")}
            rules={[
              { required: true, message: t("Nhập mật khẩu demo") },
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
          <Button htmlType="submit" type="primary" block>
            {t(tab === "login" ? "Đăng nhập demo" : "Tạo hồ sơ demo")}
          </Button>
        </Form>
      </div>
    </div>
  );
}
