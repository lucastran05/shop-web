import BulkSelectAll from "../../components/management/BulkSelectAll";
import Button from "../../components/management/ManagementButton";
import { EditOutlined, HistoryOutlined } from "@ant-design/icons";
import { useState } from "react";
import { App, Form, Input, InputNumber, Modal, Table, Tag } from "antd";
import { useManagement } from "../../hooks/useManagement";
import {
  filterInventory,
  stockStatus,
  isLowStock,
} from "../../utils/management";
import BulkActions from "../../components/management/BulkActions";
import { userError } from "../../utils/userError";

export default function InventoryPage() {
  const s = useManagement(),
    { message } = App.useApp(),
    [form] = Form.useForm();
  const [lowOnly, setLowOnly] = useState(false);
  const [editing, setEditing] = useState(null),
    [selected, setSelected] = useState([]),
    [history, setHistory] = useState(false),
    [status, setStatus] = useState(),
    [columnFilters, setColumnFilters] = useState({}),
    [query, setQuery] = useState("");
  const rows = s.products.flatMap((p) =>
    p.variants.map((v) => ({
      ...v,
      key: `${p.id}-${v.id}`,
      productId: p.id,
      product: p.name,
    })),
  );
  const filtered = filterInventory(
    rows.filter(
      (row) =>
        !s.hiddenInventory.includes(row.key) &&
        (!lowOnly || isLowStock(row.stock, s.lowStockLimit)) &&
        (!columnFilters.label?.length ||
          columnFilters.label.includes(row.label)) &&
        (!columnFilters.color?.length ||
          columnFilters.color.includes(row.color)),
    ),
    { query, status },
  );
  async function save({ delta, reason }) {
    try {
      await s.adjustInventory({
        product_id: editing.productId,
        variant_id: editing.id,
        delta,
        reason: reason.trim(),
      });
      setEditing(null);
      message.success("Đã điều chỉnh tồn kho");
    } catch (e) {
      message.error(userError(e));
    }
  }
  return (
    <>
      <div className="mg-toolbar">
        <Input.Search
          aria-label="Tìm sản phẩm"
          placeholder="Tìm sản phẩm"
          allowClear
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button
          icon={<HistoryOutlined aria-hidden="true" />}
          onClick={() => setHistory(true)}
        >
          Lịch sử điều chỉnh
        </Button>
        {!!s.hiddenInventory.length && (
          <Button onClick={() => s.setHiddenInventory([])}>
            Khôi phục danh sách kho
          </Button>
        )}
        <BulkActions
          keys={filtered.map((row) => row.key)}
          selected={selected}
          onSelect={setSelected}
          onDelete={(ids) =>
            s.setHiddenInventory((old) => [...new Set([...old, ...ids])])
          }
          description="Chỉ xóa khỏi danh sách kho; giữ nguyên sản phẩm, biến thể và số lượng tồn. Có thể khôi phục danh sách."
        />
      </div>
      <Table
        rowSelection={{
          selectedRowKeys: selected,
          onChange: setSelected,
          columnTitle: (
            <BulkSelectAll
              keys={filtered.map((row) => row.key)}
              selected={selected}
              onSelect={setSelected}
            />
          ),
        }}
        onChange={(_, filters) => {
          setStatus(filters.status?.[0]);
          setLowOnly(!!filters.stock?.includes("low"));
          setColumnFilters({ label: filters.label, color: filters.color });
        }}
        rowKey="key"
        scroll={{ x: 650 }}
        dataSource={filtered}
        columns={[
          { title: "Sản phẩm", dataIndex: "product" },
          {
            title: "Biến thể",
            dataIndex: "label",
            key: "label",
            filterSearch: true,
            filters: [...new Set(rows.map((r) => r.label).filter(Boolean))].map(
              (value) => ({ text: value, value }),
            ),
            filteredValue: columnFilters.label || null,
          },
          {
            title: "Màu",
            dataIndex: "color",
            key: "color",
            filterSearch: true,
            filters: [...new Set(rows.map((r) => r.color).filter(Boolean))].map(
              (value) => ({ text: value, value }),
            ),
            filteredValue: columnFilters.color || null,
          },
          {
            title: "Tồn kho",
            dataIndex: "stock",
            key: "stock",
            filters: [
              { text: `Sắp hết hàng (1–${s.lowStockLimit})`, value: "low" },
            ],
            filteredValue: lowOnly ? ["low"] : null,
            sorter: (a, b) => a.stock - b.stock,
            render: (n) => (
              <span>
                {n}
                {isLowStock(n, s.lowStockLimit) && (
                  <Tag color="orange" style={{ marginLeft: 8 }}>
                    Sắp hết hàng
                  </Tag>
                )}
              </span>
            ),
          },
          {
            title: "Trạng thái",
            key: "status",
            filters: ["Còn hàng", "Hết hàng"].map((value) => ({
              text: value,
              value,
            })),
            filterMultiple: false,
            filteredValue: status ? [status] : null,
            render: (_, row) => (
              <Tag color={row.stock <= 0 ? "red" : "green"}>
                {stockStatus(row.stock)}
              </Tag>
            ),
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
