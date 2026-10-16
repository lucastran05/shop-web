import Button from "../../components/management/ManagementButton";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useState } from "react";
import {
  App,
  Form,
  Image,
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
import { useManagement } from "../../hooks/useManagement";

import { money } from "../../utils/format";
import ProductImageInput from "../../components/management/ProductImageInput";
import { shopConfig } from "../../constants/shop";

export default function ProductsPage() {
  const s = useManagement(),
    { message } = App.useApp(),
    [form] = Form.useForm();
  const [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [imageLoading, setImageLoading] = useState(false),
    [selected, setSelected] = useState([]),
    [editing, setEditing] = useState(null),
    [open, setOpen] = useState(false);
  function edit(p) {
    setEditing(p);
    form.resetFields();
    form.setFieldsValue(
      p || {
        active: true,
        featured: false,
        deposit: false,
        depositRate: 20,
        variants: [
          {
            id: "standard",
            label: "Tiêu chuẩn",
            color: "",
            price: 0,
            stock: 0,
          },
        ],
      },
    );
    setOpen(true);
  }
  function save(values) {
    const p = {
      ...editing,
      ...values,
      id: editing?.id || Date.now(),
      image: values.image || "/products/1.svg",
      images: [values.image || "/products/1.svg"],
      attributes: editing?.attributes || [],
      variants: values.variants.map((v) => ({
        ...v,
        id: v.id || crypto.randomUUID(),
      })),
    };
    const next = editing
      ? s.products.map((x) => (x.id === editing.id ? p : x))
      : [...s.products, p];
    try {
      localStorage.setItem(
        `${shopConfig.storagePrefix}-management-products`,
        JSON.stringify(next),
      );
    } catch {
      message.error(
        "Không đủ dung lượng lưu. Hãy chọn ảnh nhỏ hơn hoặc dùng đường dẫn ảnh.",
      );
      return;
    }
    s.setProducts(next);
    setOpen(false);
    message.success("Đã lưu sản phẩm");
  }
  function remove(ids) {
    s.setProducts((old) => old.filter((p) => !ids.includes(p.id)));
    setSelected([]);
    message.success("Đã xóa sản phẩm");
  }
  return (
    <>
      <div className="mg-toolbar">
        <Input.Search
          allowClear
          placeholder="Tìm tên sản phẩm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => edit(null)}
        >
          Thêm sản phẩm
        </Button>
        <Popconfirm
          title={`Xóa ${selected.length} sản phẩm đã chọn?`}
          onConfirm={() => remove(selected)}
        >
          <Button
            icon={<DeleteOutlined aria-hidden="true" />}
            danger
            disabled={!selected.length}
          >
            Xóa đã chọn ({selected.length})
          </Button>
        </Popconfirm>
      </div>
      <Table
        rowKey="id"
        rowSelection={{ selectedRowKeys: selected, onChange: setSelected }}
        dataSource={s.products
          .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
          .sort((a, b) => Number(!!b.featured) - Number(!!a.featured))}
        scroll={{ x: 850 }}
        pagination={{ pageSize: 8, current: page, onChange: setPage }}
        columns={[
          {
            title: "Sản phẩm",
            dataIndex: "name",
            render: (name, p) => (
              <Space>
                <Image
                  className="mg-thumb"
                  src={p.image}
                  alt={name}
                  width={44}
                  height={44}
                />
                <span>{name}</span>
              </Space>
            ),
          },
          { title: "Danh mục", dataIndex: "category" },
          {
            title: "Giá từ",
            render: (_, p) =>
              money(Math.min(...p.variants.map((v) => v.price))),
          },
          {
            title: "Tồn kho",
            render: (_, p) => p.variants.reduce((sum, v) => sum + v.stock, 0),
          },
          {
            title: "Ghim",
            render: (_, p) => (
              <Switch
                size="small"
                aria-label={`Ghim ${p.name}`}
                checked={p.featured}
                onChange={(featured) => {
                  setPage(1);
                  s.setProducts((old) =>
                    old.map((x) => (x.id === p.id ? { ...x, featured } : x)),
                  );
                }}
              />
            ),
          },
          {
            title: "Trạng thái",
            render: (_, p) => (
              <Tag color={p.active ? "blue" : "default"}>
                {p.active ? "Đang bán" : "Tạm ẩn"}
              </Tag>
            ),
          },
          {
            title: "Thao tác",
            align: "center",
            width: 112,
            className: "mg-action-cell",
            render: (_, p) => (
              <Space>
                <Button
                  icon={<EditOutlined aria-hidden="true" />}
                  onClick={() => edit(p)}
                  aria-label="Sửa"
                  title="Sửa"
                  className="mg-icon-action"
                />
                <Popconfirm
                  title="Xóa sản phẩm này?"
                  onConfirm={() => remove([p.id])}
                >
                  <Button
                    icon={<DeleteOutlined aria-hidden="true" />}
                    danger
                    aria-label="Xóa"
                    title="Xóa"
                    className="mg-icon-action"
                  />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={editing ? "Sửa sản phẩm" : "Thêm sản phẩm"}
        open={open}
        width={720}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        okText="Lưu sản phẩm"
        okButtonProps={{ disabled: imageLoading }}
        cancelText="Hủy"
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item
            name="name"
            label="Tên sản phẩm"
            rules={[
              {
                required: true,
                whitespace: true,
                message: "Nhập tên sản phẩm",
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="category"
            label="Danh mục"
            rules={[{ required: true, message: "Chọn danh mục" }]}
          >
            <Select options={s.categories.map((value) => ({ value }))} />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="image" label="Ảnh sản phẩm">
            <ProductImageInput onLoadingChange={setImageLoading} />
          </Form.Item>
          <Space wrap>
            <Form.Item name="active" label="Đang bán" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item
              name="featured"
              label="Ghim sản phẩm"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item
              name="deposit"
              label="Cho phép đặt cọc"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item
              name="depositRate"
              label="Tỷ lệ cọc (%)"
              rules={[{ required: true }]}
            >
              <InputNumber min={1} max={100} precision={0} />
            </Form.Item>
          </Space>
          <h3>Biến thể sản phẩm</h3>
          <Form.List name="variants">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <div className="mg-variant" key={field.key}>
                    <Form.Item
                      name={[field.name, "label"]}
                      label="Tên biến thể"
                      rules={[
                        {
                          required: true,
                          whitespace: true,
                          message: "Nhập tên",
                        },
                      ]}
                    >
                      <Input />
                    </Form.Item>
                    <Form.Item name={[field.name, "color"]} label="Màu sắc">
                      <Input />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, "price"]}
                      label="Giá bán (đ)"
                      rules={[{ required: true, message: "Nhập giá" }]}
                    >
                      <InputNumber min={0} precision={0} />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, "stock"]}
                      label="Tồn kho"
                      rules={[{ required: true, message: "Nhập tồn kho" }]}
                    >
                      <InputNumber min={0} precision={0} />
                    </Form.Item>
                    <Button
                      icon={<DeleteOutlined aria-hidden="true" />}
                      danger
                      disabled={fields.length === 1}
                      onClick={() => remove(field.name)}
                      aria-label="Xóa"
                      title="Xóa"
                      className="mg-icon-action"
                    />
                  </div>
                ))}
                <Button onClick={() => add({ label: "", price: 0, stock: 0 })}>
                  Thêm biến thể
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </>
  );
}
