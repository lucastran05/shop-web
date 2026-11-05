import { Button, Form, Input, Radio, Select } from "antd";
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

  return (
    <Form form={form} layout="vertical" initialValues={initialValues} onFinish={onFinish}>
      <h2>{t("Thông tin nhận hàng")}</h2>
      {shipping && (
        <Form.Item label={t("Chọn địa chỉ đã lưu")}>
          <Select
            aria-label={t("Chọn địa chỉ đã lưu")}
            value={addressId}
            options={[
              ...addresses.map((address) => ({
                value: address.id,
                label: address.recipient_name + " — " + address.full_address,
              })),
              { value: ADD_ADDRESS, label: t("Thêm địa chỉ") },
            ]}
            onChange={(id) => (id === ADD_ADDRESS ? onAddAddress() : onSelectAddress(id))}
          />
        </Form.Item>
      )}
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
        value={delivery}
        onChange={(e) => onDeliveryChange(e.target.value)}
        options={[
          { value: "ship", label: t("Giao tận nơi") },
          { value: "pickup", label: t("Nhận tại cửa hàng") },
        ]}
      />
      {shipping && (
        <Form.Item
          name="address"
          label={t("Địa chỉ nhận hàng")}
          rules={[{ required: true, whitespace: true, message: t("Nhập địa chỉ đầy đủ") }]}
        >
          <Input.TextArea rows={2} maxLength={250} placeholder={t("Nhập số nhà, tên đường, tòa nhà…")} />
        </Form.Item>
      )}
      <Form.Item name="note" label={t("Yêu cầu bổ sung")}>
        <Input.TextArea rows={2} maxLength={500} showCount />
      </Form.Item>
      <Button type="primary" htmlType="submit">
        {t("Tiếp tục thanh toán")}
      </Button>
    </Form>
  );
}
