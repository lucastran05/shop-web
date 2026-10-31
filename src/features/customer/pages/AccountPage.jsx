import { userError } from "../../../shared/utils/userError";
import { useTranslation } from "react-i18next";
import AddressFields from "../../../shared/components/AddressFields";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Form, Input, Button, App, Modal, Tag, Empty, Popconfirm } from "antd";
import { UserOutlined, EnvironmentOutlined } from "@ant-design/icons";
import { useShop } from "../../../shared/shop/useShop";
import { api, ApiError } from "../../../shared/api";
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
    [addressForm] = Form.useForm();
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
          <div className="account-address" key={a.id}>
            <strong>
              {a.recipient_name} · {a.recipient_phone}
            </strong>
            {a.is_default && (
              <Tag color="#468432" style={{ marginLeft: 10 }}>
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
  return (
    <div className="page account-page">
      <h1>{t("Tài khoản của bạn")}</h1>
      <div className="account-panel">
        <section
          className="account-section"
          aria-labelledby="account-profile-heading"
        >
          <h2 id="account-profile-heading">
            <UserOutlined aria-hidden="true" />
            {t("Thông tin cá nhân")}
          </h2>
          <div className="account-section-content">{profile}</div>
        </section>
        <section
          className="account-section"
          aria-labelledby="account-address-heading"
        >
          <h2 id="account-address-heading">
            <EnvironmentOutlined aria-hidden="true" />
            {t("Địa chỉ nhận hàng")}
          </h2>
          <div className="account-section-content">{addressPanel}</div>
        </section>
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
