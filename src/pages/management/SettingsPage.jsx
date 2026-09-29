import { App, Card, Form, Input } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import Button from "../../components/management/ManagementButton";
import { useShop } from "../../hooks/useShop";
import { useShopConfig } from "../../hooks/useShopConfig";

export default function SettingsPage() {
  const { setShopInfo } = useShop();
  const config = useShopConfig();
  const { message } = App.useApp();
  function save(values) {
    setShopInfo({
      ...values,
      name: values.name.trim(),
      contact: { ...config.contact, ...values.contact },
    });
    message.success("Đã lưu thông tin cửa hàng");
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
          label="Liên kết bản đồ"
          rules={[
            {
              pattern: /^https?:\/\/\S+$/i,
              message: "Nhập liên kết bắt đầu bằng https:// hoặc http://",
            },
          ]}
        >
          <Input placeholder="https://maps.google.com/..." />
        </Form.Item>
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
          Lưu thay đổi
        </Button>
      </Form>
    </Card>
  );
}
