import { App, Card, Form, Input } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import Button from "../components/ManagementButton";
import { useShop } from "../../../shared/shop/useShop";
import { useShopConfig } from "../../../shared/shop/useShopConfig";
import { api } from "../../../shared/api";
import { mapShop } from "../../../shared/adapters/viewAdapters";
import { userError } from "../../../shared/utils/userError";

export default function SettingsPage() {
  const { setShopInfo } = useShop();
  const config = useShopConfig();
  const { message } = App.useApp();
  async function save(values) {
    try {
      const { data } = await api.adminSettingsShop.update({
        ...values,
        name: values.name.trim(),
        contact: { ...values.contact, map_url: values.contact.mapUrl },
      });
      setShopInfo(mapShop(data));
      message.success("Đã lưu thông tin cửa hàng");
    } catch (error) {
      message.error(userError(error));
    }
  }
  return (
    <Card className="mg-settings" title="Thông tin cửa hàng">
      <Form layout="vertical" initialValues={config} onFinish={save}>
        <Form.Item
          name="name"
          label="Tên cửa hàng"
          rules={[
            { required: true, whitespace: true, message: "Nhập tên cửa hàng" },
          ]}
        >
          <Input maxLength={80} />
        </Form.Item>
        <Form.Item name="description" label="Giới thiệu">
          <Input.TextArea rows={3} maxLength={500} showCount />
        </Form.Item>
        <Form.Item name={["contact", "phone"]} label="Số điện thoại">
          <Input type="tel" maxLength={25} />
        </Form.Item>
        <Form.Item
          name={["contact", "email"]}
          label="Email"
          rules={[{ type: "email", message: "Email không hợp lệ" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name={["contact", "address"]} label="Địa chỉ">
          <Input.TextArea rows={2} maxLength={300} />
        </Form.Item>
        <Form.Item
          name={["contact", "mapUrl"]}
          label="Liên kết hoặc tọa độ bản đồ"
          extra="Dán link Google Maps hoặc tọa độ vĩ độ, kinh độ (VD: 10.762622, 106.660172)"
          rules={[
            {
              validator: (_, value) => {
                if (!value || !value.trim()) return Promise.resolve();
                const trimmed = value.trim();
                if (
                  /^https?:\/\/\S+$/i.test(trimmed) ||
                  /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(trimmed)
                ) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error(
                    "Nhập liên kết https:// hoặc tọa độ dạng '10.7626, 106.6601'",
                  ),
                );
              },
            },
          ]}
        >
          <Input placeholder="https://maps.google.com/... hoặc 10.762622, 106.660172" />
        </Form.Item>
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
          Lưu thay đổi
        </Button>
      </Form>
    </Card>
  );
}
