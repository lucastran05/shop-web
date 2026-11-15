import { Button, Form, Input, Radio, Select } from "antd";
import { useState } from "react";
import { CarOutlined, EnvironmentOutlined, PlusOutlined, ShopOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { PHONE_PATTERN } from "./AddressModal";

const ADD_ADDRESS = "__add__";

// Bước 1: người nhận, cách giao hàng và địa chỉ
export default function RecipientForm({
  form,
  initialValues,
  addresses,
  addressId,
  delivery,
  onDeliveryChange,
  onSelectAddress,
  onAddAddress,
  onFinish,
}) {
  const { t } = useTranslation();
  const shipping = delivery === "ship";
  const [missingAddress, setMissingAddress] = useState(false);
  // Giao tận nơi bắt buộc chọn một địa chỉ đã lưu
  function finish(values) {
    if (shipping && !addressId) {
      setMissingAddress(true);
      return;
    }
    onFinish(values);
  }

  return (
    <Form form={form} layout="vertical" initialValues={initialValues} onFinish={finish}>
      <h2>{t("Thông tin nhận hàng")}</h2>
      <Form.Item
        name="name"
        label={t("Họ và tên")}
        rules={[{ required: true, whitespace: true, message: t("Nhập tên người nhận") }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="phone"
        label={t("Số điện thoại")}
        rules={[
          { required: true, message: t("Nhập số điện thoại") },
          { pattern: PHONE_PATTERN, message: t("Nhập số điện thoại Việt Nam hợp lệ") },
        ]}
      >
        <Input />
      </Form.Item>
      <h3>{t("Phương thức giao hàng")}</h3>
      <Radio.Group
        className="bt-choices"
        value={delivery}
        onChange={(e) => onDeliveryChange(e.target.value)}
      >
        <Radio value="ship">
          <CarOutlined />
          <span>
            <strong>{t("Giao tận nơi")}</strong>
            <small>{t("Shop giao tới địa chỉ bạn chọn bên dưới")}</small>
          </span>
        </Radio>
        <Radio value="pickup">
          <ShopOutlined />
          <span>
            <strong>{t("Nhận tại cửa hàng")}</strong>
            <small>{t("Không mất phí giao hàng")}</small>
          </span>
        </Radio>
      </Radio.Group>
      {shipping && (
        <>
          <h3>{t("Địa chỉ nhận hàng")}</h3>
          {addresses.length > 0 ? (
            <Radio.Group
              className="bt-choices bt-addresses"
              aria-label={t("Chọn địa chỉ đã lưu")}
              value={addressId}
              onChange={(e) => {
                const id = e.target.value;
                if (id === ADD_ADDRESS) onAddAddress();
                else {
                  setMissingAddress(false);
                  onSelectAddress(id);
                }
              }}
            >
              {addresses.map((address) => (
                <Radio key={address.id} value={address.id}>
                  <EnvironmentOutlined />
                  <span>
                    <strong>
                      {address.recipient_name} · {address.recipient_phone}
                    </strong>
                    <small>{address.full_address}</small>
                  </span>
                </Radio>
              ))}
              <Radio value={ADD_ADDRESS}>
                <PlusOutlined />
                <span>
                  <strong>{t("Thêm địa chỉ")}</strong>
                  <small>{t("Lưu lại để lần sau chọn nhanh")}</small>
                </span>
              </Radio>
            </Radio.Group>
          ) : (
            <button type="button" className="bt-add-address" onClick={onAddAddress}>
              <PlusOutlined />
              <span>
                <strong>{t("Thêm địa chỉ nhận hàng")}</strong>
                <small>{t("Bạn chưa lưu địa chỉ nào. Thêm một địa chỉ để shop giao hàng.")}</small>
              </span>
            </button>
          )}
          {missingAddress && !addressId && (
            <p className="bt-field-error" role="alert">
              {t("Thêm hoặc chọn một địa chỉ nhận hàng")}
            </p>
          )}
        </>
      )}
      <Form.Item name="note" label={t("Yêu cầu bổ sung")}>
        <Input.TextArea rows={2} maxLength={500} showCount />
      </Form.Item>
      <Button type="primary" size="large" htmlType="submit">
        {t("Tiếp tục thanh toán")}
      </Button>
    </Form>
  );
}
