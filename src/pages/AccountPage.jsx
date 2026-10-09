import { useTranslation } from "react-i18next";
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
function AccountContent() {
  const { t } = useTranslation();
  const phoneRules = [
    { required: true, message: t("Nhập số điện thoại") },
    { pattern: /^(0|\+84)[0-9]{9}$/, message: t("Số điện thoại chưa hợp lệ") },
  ];

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
    message.success(t("Đã lưu địa chỉ"));
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
        message.success(t("Đã lưu thông tin cá nhân"));
      }}
    >
      <Form.Item
        name="name"
        label={t("Họ và tên")}
        rules={[
          { required: true, whitespace: true, message: t("Nhập họ tên") },
        ]}
      >
        <Input maxLength={80} />
      </Form.Item>
      <Form.Item label={t("Email")}>
        <Input value={user.email} disabled />
      </Form.Item>
      <Form.Item name="phone" label={t("Số điện thoại")} rules={phoneRules}>
        <Input />
      </Form.Item>
      <Button type="primary" htmlType="submit">
        {t("Lưu thay đổi")}
      </Button>
    </Form>
  );
  const addressPanel = (
    <>
      <Button type="primary" onClick={() => edit(null)}>
        {t("Thêm địa chỉ")}
      </Button>
      {!addresses.length ? (
        <Empty description={t("Chưa có địa chỉ đã lưu")} />
      ) : (
        addresses.map((a) => (
          <div className="panel" style={{ marginTop: 16 }} key={a.id}>
            <strong>
              {a.name} · {a.phone}
            </strong>
            {a.id === user.defaultAddressId && (
              <Tag color="blue" style={{ marginLeft: 10 }}>
                {t("Mặc định")}
              </Tag>
            )}
            <p style={{ marginTop: 12 }}>{a.address}</p>
            <div className="address-actions">
              <Button onClick={() => edit(a)}>{t("Sửa")}</Button>
              <Popconfirm
                title={t("Xóa địa chỉ này?")}
                onConfirm={() => removeAddress(a.id)}
                okText={t("Xóa")}
                cancelText={t("Đóng")}
              >
                <Button danger>{t("Xóa")}</Button>
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
                  {t("Đặt làm mặc định")}
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
        title={t("Đổi mật khẩu cần kết nối dịch vụ xác thực")}
        description={t(
          "Đây là biểu mẫu frontend. Không nhập mật khẩu thật; bản demo không xác thực hoặc thay đổi mật khẩu.",
        )}
      />
      <Form
        form={passwordForm}
        layout="vertical"
        style={{ marginTop: 20 }}
        onFinish={() => {
          message.info(
            t("Thông tin hợp lệ. Chưa có API xác thực để đổi mật khẩu."),
          );
          passwordForm.resetFields();
        }}
      >
        <Form.Item
          name="current"
          label={t("Mật khẩu hiện tại (demo)")}
          rules={[{ required: true, message: t("Nhập mật khẩu hiện tại") }]}
        >
          <Input.Password autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="next"
          label={t("Mật khẩu mới (demo)")}
          rules={[
            { required: true, message: t("Nhập mật khẩu mới") },
            { min: 8, message: t("Tối thiểu 8 ký tự") },
          ]}
        >
          <Input.Password autoComplete="off" />
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
          <Input.Password autoComplete="off" />
        </Form.Item>
        <Button type="primary" htmlType="submit">
          {t("Kiểm tra biểu mẫu đổi mật khẩu")}
        </Button>
      </Form>
    </>
  );
  return (
    <div className="page">
      <h1>{t("Tài khoản của bạn")}</h1>
      <Alert
        type="info"
        title={t(
          "Phiên demo — dữ liệu lưu trên trình duyệt, chưa kết nối tài khoản thật",
        )}
      />
      <div className="panel" style={{ marginTop: 24 }}>
        <Tabs
          items={[
            {
              key: "profile",
              label: t("Thông tin cá nhân"),
              children: profile,
            },
            {
              key: "addresses",
              label: t("Địa chỉ nhận hàng"),
              children: addressPanel,
            },
            { key: "password", label: t("Đổi mật khẩu"), children: password },
          ]}
        />
      </div>
      <Modal
        open={!!editing}
        title={t(editing?.id ? "Sửa địa chỉ" : "Thêm địa chỉ")}
        onCancel={() => setEditing(null)}
        onOk={() => addressForm.submit()}
        okText={t("Lưu địa chỉ")}
        cancelText={t("Đóng")}
      >
        <Form form={addressForm} layout="vertical" onFinish={saveAddress}>
          <Form.Item
            name="name"
            label={t("Tên người nhận")}
            rules={[
              {
                required: true,
                whitespace: true,
                message: t("Nhập tên người nhận"),
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="phone"
            label={t("Điện thoại người nhận")}
            rules={phoneRules}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="address"
            label={t("Địa chỉ")}
            rules={[
              {
                required: true,
                whitespace: true,
                message: t("Nhập địa chỉ đầy đủ"),
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
