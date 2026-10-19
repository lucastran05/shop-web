import { userError } from "../utils/userError";
import { useTranslation } from "react-i18next";
import AddressFields from "../components/AddressFields";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Form,
  Input,
  Button,
  App,
  Tabs,
  Modal,
  Tag,
  Empty,
  Popconfirm,
} from "antd";
import { useShop } from "../hooks/useShop";
import { api, ApiError } from "../services/api";
function AccountContent() {
  const { t } = useTranslation();
  const phoneRules = [
    { required: true, message: t("Nhập số điện thoại") },
    { pattern: /^(0|\+84)[0-9]{9}$/, message: t("Số điện thoại chưa hợp lệ") },
  ];

  const { user, updateProfile, setUser } = useShop(),
    { message } = App.useApp();
  const [editing, setEditing] = useState(null),
    [addresses, setAddresses] = useState([]),
    [loadingAddresses, setLoadingAddresses] = useState(true),
    [addressForm] = Form.useForm(),
    [passwordForm] = Form.useForm();
  useEffect(() => {
    let active = true;
    api.addresses
      .list()
      .then(({ data }) => {
        if (active) setAddresses(data);
      })
      .catch((error) => {
        if (active)
          message.error(
            error instanceof ApiError
              ? userError(error)
              : t("Không thể tải sổ địa chỉ"),
          );
      })
      .finally(() => {
        if (active) setLoadingAddresses(false);
      });
    return () => {
      active = false;
    };
  }, [message, t]);
  function edit(address) {
    setEditing(address || { id: "" });
    addressForm.resetFields();
    addressForm.setFieldsValue(
      address || {
        recipient_name: user.name,
        recipient_phone: user.phone,
        is_default: addresses.length === 0,
      },
    );
  }
  async function saveAddress(values) {
    try {
      const response = editing.id
        ? await api.addresses.update(editing.id, values)
        : await api.addresses.create({
            ...values,
            is_default: values.is_default ?? addresses.length === 0,
          });
      setAddresses((old) =>
        editing.id
          ? old.map((address) =>
              address.id === editing.id ? response.data : address,
            )
          : [...old, response.data],
      );
      setEditing(null);
      message.success(response.message || t("Đã lưu địa chỉ"));
    } catch (error) {
      message.error(userError(error));
    }
  }
  async function removeAddress(id) {
    try {
      await api.addresses.delete(id);
      setAddresses((old) => old.filter((address) => address.id !== id));
      message.success(t("Đã xóa địa chỉ"));
    } catch (error) {
      message.error(userError(error));
    }
  }
  async function setDefaultAddress(id) {
    try {
      const { data } = await api.addresses.setDefault(id);
      setAddresses((old) =>
        old.map((address) => ({
          ...address,
          is_default: address.id === data.id,
        })),
      );
      setUser((old) => ({
        ...old,
        default_address_id: data.default_address_id,
      }));
    } catch (error) {
      message.error(userError(error));
    }
  }
  async function saveProfile(values) {
    try {
      await updateProfile(values);
      message.success(t("Đã lưu thông tin cá nhân"));
    } catch (error) {
      message.error(userError(error));
    }
  }
  async function changePassword(values) {
    try {
      await api.auth.changePassword({
        current_password: values.current,
        new_password: values.next,
        new_password_confirmation: values.confirm,
      });
      setUser(null);
      passwordForm.resetFields();
      message.success(t("Đổi mật khẩu thành công. Vui lòng đăng nhập lại."));
    } catch (error) {
      message.error(userError(error));
    }
  }
  const profile = (
    <Form layout="vertical" initialValues={user} onFinish={saveProfile}>
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
      {loadingAddresses ? (
        <p>{t("Đang tải địa chỉ…")}</p>
      ) : !addresses.length ? (
        <Empty description={t("Chưa có địa chỉ đã lưu")} />
      ) : (
        addresses.map((a) => (
          <div className="panel" style={{ marginTop: 16 }} key={a.id}>
            <strong>
              {a.recipient_name} · {a.recipient_phone}
            </strong>
            {a.is_default && (
              <Tag color="blue" style={{ marginLeft: 10 }}>
                {t("Mặc định")}
              </Tag>
            )}
            <p style={{ marginTop: 12 }}>{a.full_address}</p>
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
              {!a.is_default && (
                <Button onClick={() => setDefaultAddress(a.id)}>
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
      <Form
        form={passwordForm}
        layout="vertical"
        style={{ marginTop: 20 }}
        onFinish={changePassword}
      >
        <Form.Item
          name="current"
          label={t("Mật khẩu hiện tại")}
          rules={[{ required: true, message: t("Nhập mật khẩu hiện tại") }]}
        >
          <Input.Password autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="next"
          label={t("Mật khẩu mới")}
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
          {t("Đổi mật khẩu")}
        </Button>
      </Form>
    </>
  );
  return (
    <div className="page">
      <h1>{t("Tài khoản của bạn")}</h1>
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
            name="recipient_name"
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
            name="recipient_phone"
            label={t("Điện thoại người nhận")}
            rules={phoneRules}
          >
            <Input />
          </Form.Item>
          <AddressFields form={addressForm} />
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
