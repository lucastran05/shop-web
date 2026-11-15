import { userError } from "../../../shared/utils/userError";
import { useTranslation } from "react-i18next";
import AddressFields from "../../../shared/components/AddressFields";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Form, Input, Button, App, Modal, Popconfirm } from "antd";
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
    <Form
      className="bt-account-form"
      layout="vertical"
      initialValues={user}
      onFinish={saveProfile}
    >
      <Form.Item
        name="name"
        label={t("Họ và tên")}
        rules={[
          { required: true, whitespace: true, message: t("Nhập họ tên") },
        ]}
      >
        <Input maxLength={80} autoComplete="name" />
      </Form.Item>
      <Form.Item
        label={t("Email")}
        extra={t("Email dùng để đăng nhập, không thể thay đổi.")}
      >
        <Input value={user.email} disabled />
      </Form.Item>
      <Form.Item name="phone" label={t("Số điện thoại")} rules={phoneRules}>
        <Input autoComplete="tel" />
      </Form.Item>
      <Button type="primary" htmlType="submit">
        {t("Lưu thay đổi")}
      </Button>
    </Form>
  );
  const addressPanel = loadingAddresses ? (
    <div className="bt-state" role="status">
      {t("Đang tải địa chỉ…")}
    </div>
  ) : !addresses.length ? (
    <div className="bt-account-empty">
      <div className="bt-empty-arch" aria-hidden="true">
        <img src="/logo/logo.svg" alt="" />
      </div>
      <h3>{t("Chưa có địa chỉ đã lưu")}</h3>
      <p>{t("Thêm địa chỉ đầu tiên để đặt hàng nhanh hơn.")}</p>
      <Button type="primary" onClick={() => edit(null)}>
        {t("Thêm địa chỉ")}
      </Button>
    </div>
  ) : (
    <ul className="bt-address-list">
      {addresses.map((a) => (
        <li
          className={"bt-address" + (a.is_default ? " is-default" : "")}
          key={a.id}
        >
          <div className="bt-address-body">
            <div className="bt-address-who">
              <strong>{a.recipient_name}</strong>
              <span>{a.recipient_phone}</span>
              {a.is_default && (
                <span className="bt-address-badge">{t("Mặc định")}</span>
              )}
            </div>
            <p>{a.full_address}</p>
          </div>
          <div className="bt-address-actions">
            {!a.is_default && (
              <Button type="text" onClick={() => setDefaultAddress(a.id)}>
                {t("Đặt làm mặc định")}
              </Button>
            )}
            <Button type="text" onClick={() => edit(a)}>
              {t("Sửa")}
            </Button>
            <Popconfirm
              title={t("Xóa địa chỉ này?")}
              onConfirm={() => removeAddress(a.id)}
              okText={t("Xóa")}
              cancelText={t("Đóng")}
            >
              <Button type="text" danger>
                {t("Xóa")}
              </Button>
            </Popconfirm>
          </div>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="page bt-settings bt-account">
      <header className="bt-page-head">
        <h1>{t("Tài khoản của bạn")}</h1>
      </header>
      <div className="bt-settings-layout">
        <nav className="bt-settings-nav" aria-label={t("Mục tài khoản")}>
          <a href="#account-profile-heading">{t("Thông tin cá nhân")}</a>
          <a href="#account-address-heading">{t("Địa chỉ nhận hàng")}</a>
        </nav>
        <div className="bt-settings-body">
          <section
            className="bt-settings-section"
            aria-labelledby="account-profile-heading"
          >
            <h2 id="account-profile-heading">{t("Thông tin cá nhân")}</h2>
            {profile}
          </section>
          <section
            className="bt-settings-section"
            aria-labelledby="account-address-heading"
          >
            <div className="bt-section-head">
              <h2 id="account-address-heading">{t("Địa chỉ nhận hàng")}</h2>
              {addresses.length > 0 && (
                <Button onClick={() => edit(null)}>{t("Thêm địa chỉ")}</Button>
              )}
            </div>
            {addressPanel}
          </section>
        </div>
      </div>
      <Modal
        rootClassName="bt-od bt-address-modal"
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
