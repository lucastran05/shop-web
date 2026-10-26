import { userError } from "../../utils/userError";
import Button from "../../components/management/ManagementButton";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { App, Form, Input } from "antd";
import { ShopOutlined } from "@ant-design/icons";
import { useShopConfig } from "../../hooks/useShopConfig";
import { useManagement } from "../../hooks/useManagement";
import { useState } from "react";
import { api } from "../../services/api";
export default function LoginPage() {
  const shopConfig = useShopConfig();
  const s = useManagement(),
    navigate = useNavigate(),
    [loading, setLoading] = useState(false),
    { message } = App.useApp();
  if (s.session) return <Navigate to="/management" replace />;
  async function submit(values) {
    setLoading(true);
    try {
      const { data } = await api.auth.login({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });
      if (!["admin", "manager"].includes(data.user.role)) {
        api.http.clearTokens();
        message.error("Tài khoản không có quyền truy cập trang quản lý.");
        return;
      }
      if (!data.user.is_active) {
        api.http.clearTokens();
        message.error("Tài khoản đã bị khóa.");
        return;
      }
      await s.setSession({ id: data.user.id });
      navigate("/management", { replace: true });
    } catch (error) {
      message.error(
        error?.status === 401
          ? "Email hoặc mật khẩu không chính xác."
          : userError(error),
      );
    } finally {
      setLoading(false);
    }
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
          <Button block htmlType="submit" type="primary" loading={loading}>
            Đăng nhập
          </Button>
        </Form>
        <Link to="/">← Về cửa hàng</Link>
      </div>
    </div>
  );
}
