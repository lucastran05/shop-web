import { App, Form, Input, Modal } from "antd";
import { useTranslation } from "react-i18next";
import { api } from "../../../../shared/api";
import AddressFields from "../../../../shared/components/AddressFields";
import { userError } from "../../../../shared/utils/userError";

export const PHONE_PATTERN = /^(0|\+84)[0-9]{9}$/;

// Hộp thoại thêm địa chỉ mới vào sổ địa chỉ ngay trong lúc đặt hàng
export default function AddressModal({ open, form, makeDefault, onClose, onSaved }) {
  const { t } = useTranslation();
  const { message } = App.useApp();

  async function save(values) {
    try {
      const { data } = await api.addresses.create({
        recipient_name: values.name,
        recipient_phone: values.phone,
        province_code: values.province_code,
        ward_code: values.ward_code,
        street_address: values.street_address,
        is_default: makeDefault,
      });
      onSaved(data);
      message.success(t("Đã lưu địa chỉ"));
    } catch (error) {
      message.error(userError(error));
    }
  }

  return (
    <Modal
      open={open}
      title={t("Thêm địa chỉ")}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText={t("Lưu địa chỉ")}
      cancelText={t("Đóng")}
    >
      <Form form={form} layout="vertical" onFinish={save}>
        <Form.Item
          name="name"
          label={t("Tên người nhận")}
          rules={[{ required: true, whitespace: true, message: t("Nhập tên người nhận") }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="phone"
          label={t("Điện thoại người nhận")}
          rules={[
            { required: true, message: t("Nhập số điện thoại") },
            { pattern: PHONE_PATTERN, message: t("Số điện thoại chưa hợp lệ") },
          ]}
        >
          <Input />
        </Form.Item>
        <AddressFields form={form} />
      </Form>
    </Modal>
  );
}
