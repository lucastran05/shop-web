import Button from "../../components/management/ManagementButton";
import { EditOutlined, HistoryOutlined } from "@ant-design/icons";
import { useState } from "react";
import {
  App,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Switch,
  Table,
  Tag,
} from "antd";
import { useManagement } from "../../hooks/useManagement";
import { PageTitle } from "../../components/management/PageTitle";
import { adjustStock } from "../../utils/management";

export default function InventoryPage() {
  const s = useManagement(),
    { message } = App.useApp(),
    [form] = Form.useForm();
  const [editing, setEditing] = useState(null),
    [history, setHistory] = useState(false),
    [lowOnly, setLowOnly] = useState(false),
    [query, setQuery] = useState("");
  const rows = s.products.flatMap((p) =>
    p.variants.map((v) => ({
      ...v,
      key: `${p.id}-${v.id}`,
      productId: p.id,
      product: p.name,
    })),
  );
  function save({ delta, reason }) {
    try {
      s.setProducts(
        adjustStock(s.products, editing.productId, editing.id, delta),
      );
      s.setStockHistory((old) => [
        {
          id: crypto.randomUUID(),
          product: editing.product,
          variant: editing.label,
          delta,
          reason: reason.trim(),
          at: new Date().toISOString(),
        },
        ...old,
      ]);
      setEditing(null);
      message.success("Đã điều chỉnh tồn kho");
    } catch (e) {
      message.error(e.message);
    }
  }
  return (
    <>
      <PageTitle
        title="Quản lý kho"
        description="Theo dõi tồn kho theo từng biến thể. Mọi điều chỉnh đều lưu lịch sử."
      />
      <div className="mg-toolbar">
        <Input.Search
          placeholder="Tìm sản phẩm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Space>
          <Switch checked={lowOnly} onChange={setLowOnly} />
          Chỉ hiện tồn ≤ 5
        </Space>
        <Button
          icon={<HistoryOutlined aria-hidden="true" />}
          onClick={() => setHistory(true)}
        >
          Lịch sử điều chỉnh
        </Button>
      </div>
      <Table
        rowSelection={{}}
        rowKey="key"
        scroll={{ x: 650 }}
        dataSource={rows.filter(
          (r) =>
            (!lowOnly || r.stock <= 5) &&
            r.product.toLowerCase().includes(query.toLowerCase()),
        )}
        columns={[
          { title: "Sản phẩm", dataIndex: "product" },
          { title: "Biến thể", dataIndex: "label" },
          { title: "Màu", dataIndex: "color" },
          {
            title: "Tồn kho",
            dataIndex: "stock",
            render: (n) => <Tag color={n <= 5 ? "red" : "blue"}>{n}</Tag>,
          },
          {
            title: "Thao tác",
            align: "center",
            width: 80,
            className: "mg-action-cell",
            render: (_, r) => (
              <Button
                icon={<EditOutlined aria-hidden="true" />}
                onClick={() => {
                  setEditing(r);
                  form.resetFields();
                }}
                aria-label="Điều chỉnh"
                title="Điều chỉnh"
                className="mg-icon-action"
              />
            ),
          },
        ]}
      />
      <Modal
        title={`Điều chỉnh kho · ${editing?.product || ""}`}
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={() => form.submit()}
        okText="Lưu"
        cancelText="Hủy"
      >
        <p>
          Tồn hiện tại: {editing?.stock}. Nhập số dương để nhập kho, số âm để
          giảm kho.
        </p>
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item
            name="delta"
            label="Số lượng thay đổi"
            rules={[{ required: true, message: "Nhập số lượng" }]}
          >
            <InputNumber precision={0} />
          </Form.Item>
          <Form.Item
            name="reason"
            label="Lý do"
            rules={[
              {
                required: true,
                whitespace: true,
                message: "Nhập lý do điều chỉnh",
              },
            ]}
          >
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="Lịch sử điều chỉnh kho"
        open={history}
        onCancel={() => setHistory(false)}
        footer={null}
        width={850}
      >
        <Table
          rowKey="id"
          dataSource={s.stockHistory}
          columns={[
            {
              title: "Thời gian",
              dataIndex: "at",
              render: (x) => new Date(x).toLocaleString("vi-VN"),
            },
            { title: "Sản phẩm", dataIndex: "product" },
            { title: "Biến thể", dataIndex: "variant" },
            { title: "Thay đổi", dataIndex: "delta" },
            { title: "Lý do", dataIndex: "reason" },
          ]}
        />
      </Modal>
    </>
  );
}
