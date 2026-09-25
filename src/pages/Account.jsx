import { useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Form,
  Input,
  Button,
  App,
  Alert,
  Tabs,
  Modal,
  Tag,
  Empty,
  Popconfirm,
} from "antd";
import { useShop } from "../hooks/useShop";
const phoneRules = [
  { required: true, message: "Nhập số điện thoại" },
  { pattern: /^(0|\+84)[0-9]{9}$/, message: "Số điện thoại chưa hợp lệ" },
];
function AccountContent() {
  const { user, updateProfile } = useShop(),
    { message } = App.useApp();
  const [editing, setEditing] = useState(null),
    [addressForm] = Form.useForm(),
    [passwordForm] = Form.useForm();
  const addresses = user.addresses || [];
  function edit(address) {
    setEditing(address || { id: "" });
    addressForm.resetFields();
    addressForm.setFieldsValue(
      address || { name: user.name, phone: user.phone, address: "" },
    );
  }
  function saveAddress(values) {
    const id = editing.id || crypto.randomUUID();
    const next = editing.id
      ? addresses.map((a) => (a.id === id ? { ...a, ...values } : a))
      : [...addresses, { id, ...values }];
    const defaultId = user.defaultAddressId || id;
    const selected = next.find((a) => a.id === defaultId);
    updateProfile({
      addresses: next,
      defaultAddressId: defaultId,
      address: selected?.address || "",
    });
    setEditing(null);
    message.success("Đã lưu địa chỉ");
  }
  function removeAddress(id) {
    const next = addresses.filter((a) => a.id !== id);
    const defaultId =
      user.defaultAddressId === id ? next[0]?.id : user.defaultAddressId;
    updateProfile({
      addresses: next,
      defaultAddressId: defaultId,
      address: next.find((a) => a.id === defaultId)?.address || "",
    });
  }
  const profile = (
    <Form
      layout="vertical"
      initialValues={user}
      onFinish={(v) => {
        updateProfile(v);
        message.success("Đã lưu thông tin cá nhân");
      }}
    >
      <Form.Item
        name="name"
        label="Họ và tên"
        rules={[{ required: true, whitespace: true, message: "Nhập họ tên" }]}
      >
        <Input maxLength={80} />
      </Form.Item>
      <Form.Item label="Email">
        <Input value={user.email} disabled />
      </Form.Item>
      <Form.Item name="phone" label="Số điện thoại" rules={phoneRules}>
        <Input />
      </Form.Item>
      <Button type="primary" htmlType="submit">
        Lưu thay đổi
      </Button>
    </Form>
  );
  const addressPanel = (
    <>
      <Button type="primary" onClick={() => edit(null)}>
        Thêm địa chỉ
      </Button>
      {!addresses.length ? (
        <Empty description="Chưa có địa chỉ đã lưu" />
      ) : (
        addresses.map((a) => (
          <div className="panel" style={{ marginTop: 16 }} key={a.id}>
            <strong>
              {a.name} · {a.phone}
            </strong>
            {a.id === user.defaultAddressId && (
              <Tag color="blue" style={{ marginLeft: 10 }}>
                Mặc định
              </Tag>
            )}
            <p style={{ marginTop: 12 }}>{a.address}</p>
            <div className="address-actions">
              <Button onClick={() => edit(a)}>Sửa</Button>
              <Popconfirm
                title="Xóa địa chỉ này?"
                onConfirm={() => removeAddress(a.id)}
                okText="Xóa"
                cancelText="Đóng"
              >
                <Button danger>Xóa</Button>
              </Popconfirm>
              {a.id !== user.defaultAddressId && (
                <Button
                  onClick={() =>
                    updateProfile({
                      defaultAddressId: a.id,
                      address: a.address,
                    })
                  }
                >
                  Đặt làm mặc định
                </Button>
              )}
            </div>
          </div>
        ))
      )}
    </>
  );
  const password = (
    <>
      <Alert
        type="info"
        showIcon
        title="Đổi mật khẩu cần kết nối dịch vụ xác thực"
        description="Đây là biểu mẫu frontend. Không nhập mật khẩu thật; bản demo không xác thực hoặc thay đổi mật khẩu."
      />
      <Form
        form={passwordForm}
        layout="vertical"
        style={{ marginTop: 20 }}
        onFinish={() => {
          message.info(
            "Thông tin hợp lệ. Chưa có API xác thực để đổi mật khẩu.",
          );
          passwordForm.resetFields();
        }}
      >
        <Form.Item
          name="current"
          label="Mật khẩu hiện tại (demo)"
          rules={[{ required: true, message: "Nhập mật khẩu hiện tại" }]}
        >
          <Input.Password autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="next"
          label="Mật khẩu mới (demo)"
          rules={[
            { required: true, message: "Nhập mật khẩu mới" },
            { min: 8, message: "Tối thiểu 8 ký tự" },
          ]}
        >
          <Input.Password autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="confirm"
          label="Nhập lại mật khẩu mới"
          dependencies={["next"]}
          rules={[
            { required: true, message: "Nhập lại mật khẩu" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                return !value || value === getFieldValue("next")
                  ? Promise.resolve()
                  : Promise.reject(new Error("Mật khẩu không khớp"));
              },
            }),
          ]}
        >
          <Input.Password autoComplete="off" />
        </Form.Item>
        <Button type="primary" htmlType="submit">
          Kiểm tra biểu mẫu đổi mật khẩu
        </Button>
      </Form>
    </>
  );
  return (
    <div className="page">
      <h1>Tài khoản của bạn</h1>
      <Alert
        type="info"
        title="Phiên demo — dữ liệu lưu trên trình duyệt, chưa kết nối tài khoản thật"
      />
      <div className="panel" style={{ marginTop: 24 }}>
        <Tabs
          items={[
            { key: "profile", label: "Thông tin cá nhân", children: profile },
            {
              key: "addresses",
              label: "Địa chỉ nhận hàng",
              children: addressPanel,
            },
            { key: "password", label: "Đổi mật khẩu", children: password },
          ]}
        />
      </div>
      <Modal
        open={!!editing}
        title={editing?.id ? "Sửa địa chỉ" : "Thêm địa chỉ"}
        onCancel={() => setEditing(null)}
        onOk={() => addressForm.submit()}
        okText="Lưu địa chỉ"
        cancelText="Đóng"
      >
        <Form form={addressForm} layout="vertical" onFinish={saveAddress}>
          <Form.Item
            name="name"
            label="Tên người nhận"
            rules={[
              {
                required: true,
                whitespace: true,
                message: "Nhập tên người nhận",
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Điện thoại người nhận"
            rules={phoneRules}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="address"
            label="Địa chỉ"
            rules={[
              {
                required: true,
                whitespace: true,
                message: "Nhập địa chỉ đầy đủ",
              },
            ]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
export default function Account() {
  const { user } = useShop();
  return user ? (
    <AccountContent key={user.email} />
  ) : (
    <Navigate to="/login?next=/account" replace />
  );
}
