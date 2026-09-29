import Button from "../../components/management/ManagementButton";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { App, Form, Input } from "antd";
import { ShopOutlined } from "@ant-design/icons";
import { useShopConfig } from "../../hooks/useShopConfig";
import { useManagement } from "../../hooks/useManagement";
export default function LoginPage() {
  const shopConfig = useShopConfig();
  const s = useManagement(),
    navigate = useNavigate(),
    { message } = App.useApp();
  if (s.session) return <Navigate to="/management" replace />;
  function submit(values) {
    const email = values.email.trim().toLowerCase();
    const user = s.users.find((user) => user.email.toLowerCase() === email);
    if (!user || !user.active || !["admin", "manager"].includes(user.role)) {
      message.error("Tài khoản không có quyền truy cập trang quản lý.");
      return;
    }
    // Frontend-only session, following the Customer form. Password is not stored.
    s.setSession({ id: user.id });
    navigate("/management", { replace: true });
  }
  return (
    <div className="mg-login">
      <div className="mg-login-card">
        <span className="mg-brand-mark">
          <ShopOutlined />
        </span>
        <p className="mg-eyebrow">{shopConfig.name}</p>
        <h1>Đăng nhập quản lý</h1>
        <Form layout="vertical" onFinish={submit}>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Nhập email" },
              { type: "email", message: "Email chưa hợp lệ" },
            ]}
          >
            <Input autoComplete="username" placeholder="Nhập email" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[
              { required: true, message: "Nhập mật khẩu" },
              { min: 6, message: "Tối thiểu 6 ký tự" },
            ]}
          >
            <Input.Password autoComplete="off" placeholder="Nhập mật khẩu" />
          </Form.Item>
          <Button block htmlType="submit" type="primary">
            Đăng nhập
          </Button>
        </Form>
        <Link to="/">← Về cửa hàng</Link>
      </div>
    </div>
  );
}
