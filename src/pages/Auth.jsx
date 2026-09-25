import { shopConfig } from "../constants/shop";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Button, Form, Input, Tabs, App } from "antd";
import { useShop } from "../hooks/useShop";
export default function Auth() {
  const [tab, setTab] = useState("login"),
    { setUser, profiles } = useShop(),
    navigate = useNavigate(),
    [params] = useSearchParams(),
    { message } = App.useApp();
  function submit(values) {
    setUser(
      profiles[values.email.trim().toLowerCase()] || {
        name: values.name || values.email.split("@")[0],
        email: values.email.trim().toLowerCase(),
        phone: "",
        address: "",
      },
    );
    message.success("Đã vào phiên Customer demo");
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
        <p>Đăng nhập để đặt hàng và theo dõi đơn hàng của bạn.</p>
      </div>
      <div className="auth-form">
        <h2>Tài khoản khách hàng</h2>
        <p className="muted">
          Lưu những lựa chọn và theo dõi đơn hàng của bạn.
        </p>
        <Alert
          type="info"
          showIcon
          title="Phiên trải nghiệm giao diện"
          description="Chưa có API xác thực. Email chỉ dùng để tạo hồ sơ demo trên trình duyệt; không nhập mật khẩu thật."
        />
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            { key: "login", label: "Đăng nhập" },
            { key: "register", label: "Đăng ký" },
          ]}
        />
        <Form key={tab} layout="vertical" onFinish={submit}>
          {tab === "register" && (
            <Form.Item
              name="name"
              label="Họ và tên"
              rules={[
                { required: true, whitespace: true, message: "Nhập họ và tên" },
              ]}
            >
              <Input maxLength={80} />
            </Form.Item>
          )}
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Nhập email" },
              { type: "email", message: "Email chưa hợp lệ" },
            ]}
          >
            <Input placeholder="ban@example.com" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Mật khẩu demo (không lưu)"
            rules={[
              { required: true, message: "Nhập mật khẩu demo" },
              { min: 6, message: "Tối thiểu 6 ký tự" },
            ]}
          >
            <Input.Password autoComplete="off" />
          </Form.Item>
          <Button htmlType="submit" type="primary" block>
            {tab === "login" ? "Đăng nhập demo" : "Tạo hồ sơ demo"}
          </Button>
        </Form>
      </div>
    </div>
  );
}
