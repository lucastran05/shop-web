import Button from "../components/ManagementButton";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useState } from "react";
import {
  App,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from "antd";
import { useManagement } from "../hooks/useManagement";
import { money } from "../../../shared/utils/format";
import { userError } from "../../../shared/utils/userError";
import { ApiError } from "../../../shared/api";

function voucherError(error) {
  return error instanceof ApiError && error.status >= 400 && error.status < 500
    ? error.message
    : userError(error);
}

function dateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  // datetime-local không có múi giờ; hiển thị theo múi giờ máy người dùng.
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function datePayload(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function voucherStatus(voucher) {
  const now = Date.now();
  if (!voucher.active) return { label: "Tạm tắt", color: "default" };
  if (voucher.starts_at && new Date(voucher.starts_at).getTime() > now)
    return { label: "Chưa bắt đầu", color: "gold" };
  if (voucher.expires_at && new Date(voucher.expires_at).getTime() < now)
    return { label: "Đã hết hạn", color: "red" };
  if (voucher.remaining_count === 0) return { label: "Hết lượt", color: "red" };
  return { label: "Đang hoạt động", color: "green" };
}

export default function VouchersPage() {
  const s = useManagement();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState("");

  function edit(voucher) {
    setEditing(voucher);
    form.resetFields();
    form.setFieldsValue(
      voucher
        ? { ...voucher, starts_at: dateInput(voucher.starts_at), expires_at: dateInput(voucher.expires_at) }
        : {
            active: true,
            discount_type: "percentage",
            discount_value: 10,
            min_order_amount: 0,
            max_discount_amount: null,
            usage_limit: null,
            starts_at: "",
            expires_at: "",
          },
    );
    setOpen(true);
  }

  async function save(values) {
    const payload = {
      ...values,
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      starts_at: datePayload(values.starts_at),
      expires_at: datePayload(values.expires_at),
      usage_limit: values.usage_limit === null || values.usage_limit === "" ? null : values.usage_limit,
      max_discount_amount:
        values.max_discount_amount === null || values.max_discount_amount === ""
          ? null
          : values.max_discount_amount,
    };
    try {
      await s.saveVoucher(payload, editing?.id);
      setOpen(false);
      message.success(editing ? "Đã cập nhật voucher" : "Đã tạo voucher");
    } catch (error) {
      message.error(voucherError(error));
    }
  }

  async function remove(ids) {
    try {
      const result = await s.removeVouchers(ids);
      setSelected([]);
      if (result.failed?.length) message.warning("Một số voucher không còn tồn tại");
      else message.success("Đã xóa voucher đã chọn");
    } catch (error) {
      message.error(voucherError(error));
    }
  }

  const rows = s.vouchers.filter((voucher) =>
    `${voucher.code} ${voucher.name}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <>
      <div className="mg-toolbar">
        <Input.Search
          allowClear
          placeholder="Tìm mã hoặc tên voucher"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => edit(null)}>
          Thêm voucher
        </Button>
        <Popconfirm
          title="Xóa các voucher đã chọn?"
          onConfirm={() => remove(selected)}
          disabled={!selected.length}
        >
          <Button danger icon={<DeleteOutlined />} disabled={!selected.length}>
            Xóa đã chọn ({selected.length})
          </Button>
        </Popconfirm>
      </div>
      <Table
        rowKey="id"
        rowSelection={{ selectedRowKeys: selected, onChange: setSelected }}
        dataSource={rows}
        scroll={{ x: 1100 }}
        columns={[
          { title: "Mã", dataIndex: "code", render: (value) => <strong>{value}</strong> },
          { title: "Tên voucher", dataIndex: "name" },
          {
            title: "Mức giảm",
            render: (_, voucher) =>
              voucher.discount_type === "percentage"
                ? `${voucher.discount_value}%`
                : voucher.discount_type === "fixed"
                  ? money(voucher.discount_value)
                  : "Miễn phí vận chuyển",
          },
          { title: "Đơn tối thiểu", dataIndex: "min_order_amount", render: money },
          {
            title: "Lượt dùng",
            render: (_, voucher) =>
              `${voucher.used_count}/${voucher.usage_limit === null ? "∞" : voucher.usage_limit}`,
          },
          {
            title: "Trạng thái",
            render: (_, voucher) => {
              const status = voucherStatus(voucher);
              return <Tag color={status.color}>{status.label}</Tag>;
            },
          },
          {
            title: "Thao tác",
            render: (_, voucher) => (
              <Space>
                <Button aria-label="Sửa" className="mg-icon-action" icon={<EditOutlined />} onClick={() => edit(voucher)} />
                <Popconfirm title="Xóa voucher này?" onConfirm={() => remove([voucher.id])}>
                  <Button danger aria-label="Xóa" className="mg-icon-action" icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={editing ? "Sửa voucher" : "Thêm voucher"}
        open={open}
        width={650}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        okText="Lưu voucher"
        cancelText="Hủy"
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item
            name="code"
            label="Mã voucher"
            rules={[
              { required: true, message: "Nhập mã voucher" },
              {
                pattern: /^[A-Za-z0-9][A-Za-z0-9 _-]{1,48}[A-Za-z0-9]$/,
                message: "Mã dài 3-50 ký tự, chỉ gồm chữ, số, khoảng trắng, - hoặc _",
              },
            ]}
          >
            <Input maxLength={50} placeholder="VD: SALE20" disabled={Boolean(editing)} />
          </Form.Item>
          <Form.Item name="name" label="Tên voucher" rules={[{ required: true, message: "Nhập tên voucher" }]}>
            <Input maxLength={255} />
          </Form.Item>
          <Space wrap>
            <Form.Item name="discount_type" label="Kiểu giảm" rules={[{ required: true }]}>
              <Select
                style={{ width: 190 }}
                options={[
                  { value: "percentage", label: "Theo phần trăm" },
                  { value: "fixed", label: "Theo số tiền" },
                  { value: "free_shipping", label: "Miễn phí vận chuyển" },
                ]}
              />
            </Form.Item>
            <Form.Item name="discount_value" label="Giá trị giảm" rules={[{ required: true, message: "Nhập giá trị giảm" }]}>
              <InputNumber min={0} style={{ width: 180 }} />
            </Form.Item>
          </Space>
          <Space wrap>
            <Form.Item name="min_order_amount" label="Đơn tối thiểu">
              <InputNumber min={0} style={{ width: 180 }} addonAfter="đ" />
            </Form.Item>
            <Form.Item name="max_discount_amount" label="Giảm tối đa">
              <InputNumber min={0} style={{ width: 180 }} addonAfter="đ" placeholder="Không giới hạn" />
            </Form.Item>
            <Form.Item name="usage_limit" label="Tổng lượt dùng">
              <InputNumber min={0} style={{ width: 180 }} placeholder="Không giới hạn" />
            </Form.Item>
          </Space>
          <Space wrap>
            <Form.Item name="starts_at" label="Bắt đầu">
              <Input type="datetime-local" />
            </Form.Item>
            <Form.Item name="expires_at" label="Kết thúc">
              <Input type="datetime-local" />
            </Form.Item>
          </Space>
          <Form.Item name="active" label="Đang hoạt động" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
