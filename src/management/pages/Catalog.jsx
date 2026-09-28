import { useState } from "react";
import {
  App,
  Button,
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
import { PlusOutlined } from "@ant-design/icons";
import { useManagement } from "../context";
import { PageTitle } from "../PageTitle";
import { adjustStock } from "../model";
import { money } from "../../utils/format";

export function ProductsPage() {
  const s = useManagement(),
    { message } = App.useApp(),
    [form] = Form.useForm();
  const [query, setQuery] = useState(""),
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
    s.setProducts((old) =>
      editing ? old.map((x) => (x.id === editing.id ? p : x)) : [...old, p],
    );
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
      <PageTitle
        title="Quản lý sản phẩm"
        description="Thêm, sửa, xóa và ghim sản phẩm của cửa hàng."
      />
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
          <Button danger disabled={!selected.length}>
            Xóa đã chọn ({selected.length})
          </Button>
        </Popconfirm>
      </div>
      <Table
        rowKey="id"
        rowSelection={{ selectedRowKeys: selected, onChange: setSelected }}
        dataSource={s.products.filter((p) =>
          p.name.toLowerCase().includes(query.toLowerCase()),
        )}
        scroll={{ x: 850 }}
        pagination={{ pageSize: 8 }}
        columns={[
          {
            title: "Sản phẩm",
            dataIndex: "name",
            render: (name, p) => (
              <Space>
                <img className="mg-thumb" src={p.image} alt="" />
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
                onChange={(featured) =>
                  s.setProducts((old) =>
                    old.map((x) => (x.id === p.id ? { ...x, featured } : x)),
                  )
                }
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
            render: (_, p) => (
              <Space>
                <Button size="small" onClick={() => edit(p)}>
                  Sửa
                </Button>
                <Popconfirm
                  title="Xóa sản phẩm này?"
                  onConfirm={() => remove([p.id])}
                >
                  <Button size="small" danger>
                    Xóa
                  </Button>
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
          <Form.Item name="image" label="Đường dẫn ảnh">
            <Input placeholder="/products/1.svg hoặc https://..." />
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
                      danger
                      disabled={fields.length === 1}
                      onClick={() => remove(field.name)}
                    >
                      Xóa
                    </Button>
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

export function CategoriesPage() {
  const s = useManagement(),
    { message } = App.useApp(),
    [form] = Form.useForm();
  const [open, setOpen] = useState(false),
    [editing, setEditing] = useState(null),
    [selected, setSelected] = useState([]);
  function edit(name) {
    setEditing(name);
    form.setFieldsValue({ name: name || "" });
    setOpen(true);
  }
  function remove(names) {
    if (s.products.some((p) => names.includes(p.category)))
      return message.error(
        "Danh mục đang có sản phẩm, hãy chuyển sản phẩm trước khi xóa.",
      );
    s.setCategories((old) => old.filter((c) => !names.includes(c)));
    setSelected([]);
  }
  function save({ name }) {
    name = name.trim();
    if (s.categories.includes(name) && name !== editing)
      return message.error("Tên danh mục đã tồn tại");
    s.setCategories((old) =>
      editing ? old.map((c) => (c === editing ? name : c)) : [...old, name],
    );
    if (editing)
      s.setProducts((old) =>
        old.map((p) => (p.category === editing ? { ...p, category: name } : p)),
      );
    setSelected([]);
    setOpen(false);
  }
  return (
    <>
      <PageTitle
        title="Quản lý danh mục"
        description="Sắp xếp sản phẩm theo nhóm."
      />
      <div className="mg-toolbar">
        <Button type="primary" onClick={() => edit(null)}>
          Thêm danh mục
        </Button>
        <Popconfirm
          title="Xóa các danh mục đã chọn?"
          onConfirm={() => remove(selected)}
        >
          <Button danger disabled={!selected.length}>
            Xóa đã chọn
          </Button>
        </Popconfirm>
      </div>
      <Table
        rowKey="name"
        rowSelection={{ selectedRowKeys: selected, onChange: setSelected }}
        dataSource={s.categories.map((name) => ({ name }))}
        columns={[
          { title: "Tên danh mục", dataIndex: "name" },
          {
            title: "Số sản phẩm",
            render: (_, r) =>
              s.products.filter((p) => p.category === r.name).length,
          },
          {
            title: "Thao tác",
            render: (_, r) => (
              <Space>
                <Button onClick={() => edit(r.name)}>Sửa</Button>
                <Popconfirm
                  title="Xóa danh mục?"
                  onConfirm={() => remove([r.name])}
                >
                  <Button danger>Xóa</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={editing ? "Sửa danh mục" : "Thêm danh mục"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form form={form} onFinish={save} layout="vertical">
          <Form.Item
            name="name"
            label="Tên danh mục"
            rules={[
              {
                required: true,
                whitespace: true,
                message: "Nhập tên danh mục",
              },
            ]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export function InventoryPage() {
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
        <Button onClick={() => setHistory(true)}>Lịch sử điều chỉnh</Button>
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
            render: (_, r) => (
              <Button
                onClick={() => {
                  setEditing(r);
                  form.resetFields();
                }}
              >
                Điều chỉnh
              </Button>
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
