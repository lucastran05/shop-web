import Button from "../components/ManagementButton";
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
import { useManagement } from "../hooks/useManagement";

import { money } from "../../../shared/utils/format";
import ProductImageInput from "../components/ProductImageInput";
import { userError } from "../../../shared/utils/userError";
import { getVariantImages } from "../../../shared/adapters/productAdapter";
import ExpandableText from "../../../shared/components/ExpandableText";

const visibilityConfig = {
  public: { label: "Hiển thị", color: "green" },
  private: { label: "Private", color: "blue" },
  coming_soon: { label: "Coming soon", color: "orange" },
  hidden: { label: "Ẩn", color: "default" },
};

export default function ProductsPage() {
  const s = useManagement(),
    { message } = App.useApp(),
    [form] = Form.useForm();
  const [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [imageLoading, setImageLoading] = useState(0),
    [selected, setSelected] = useState([]),
    [editing, setEditing] = useState(null),
    [open, setOpen] = useState(false);
  function edit(p) {
    setEditing(p);
    form.resetFields();
    form.setFieldsValue(
      p
        ? {
            ...p,
            visibility: p.visibility || (p.active ? "public" : "hidden"),
          }
        : {
            visibility: "public",
            featured: false,
            deposit: false,
            depositRate: 50,
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
  async function save(values) {
    const images = getVariantImages(values.variants);
    const visibility = values.visibility || "public";
    const p = {
      ...editing,
      ...values,
      visibility,
      active: visibility !== "hidden",
      id: editing?.id || Date.now(),
      image: images[0] || "",
      images,
      attributes: [
        ...(editing?.attributes || []).filter(
          (a) => a.name !== "visibility" && a.name !== "_visibility",
        ),
        { name: "visibility", value: visibility },
      ],
      variants: values.variants.map((v) => ({
        ...editing?.variants.find((variant) => variant.id === v.id),
        ...v,
        id: v.id || crypto.randomUUID(),
      })),
    };
    try {
      await s.saveProduct(p, editing?.id);
    } catch (error) {
      message.error(userError(error));
      return;
    }
    setOpen(false);
    message.success("Đã lưu sản phẩm");
  }
  async function remove(ids) {
    try {
      await s.removeProducts(ids);
    } catch (error) {
      message.error(userError(error));
      return;
    }
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
              <Space align="start">
                <Image
                  className="mg-thumb"
                  src={p.image}
                  alt={name}
                  width={44}
                  height={44}
                />
                <ExpandableText text={name} maxLength={40} />
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
                  ).catch((error) => message.error(userError(error)));
                }}
              />
            ),
          },
          {
            title: "Trạng thái",
            render: (_, p) => {
              const vis = p.visibility || (p.active ? "public" : "hidden");
              const cfg = visibilityConfig[vis] || visibilityConfig.public;
              return <Tag color={cfg.color}>{cfg.label}</Tag>;
            },
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
        width={1120}
        className="mg-editor-modal"
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        okText="Lưu sản phẩm"
        okButtonProps={{ disabled: imageLoading > 0 }}
        cancelText="Hủy"
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={save}>
          <div className="mg-product-basics">
            <section className="mg-form-section">
              <h3>Thông tin sản phẩm</h3>
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
                <Input.TextArea rows={4} />
              </Form.Item>
            </section>
            <section className="mg-form-section">
              <h3>Hiển thị & đặt cọc</h3>
              <Form.Item
                name="visibility"
                label="Trạng thái hàng"
                rules={[{ required: true, message: "Chọn trạng thái" }]}
              >
                <Select
                  options={[
                    { value: "public", label: "Hiển thị" },
                    {
                      value: "private",
                      label: "Riêng tư (khách hàng đã đăng nhập)",
                    },
                    { value: "coming_soon", label: "Chuẩn bị mở bán" },
                    { value: "hidden", label: "Ẩn" },
                  ]}
                />
              </Form.Item>
              <Space wrap>
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
                  label="Cọc tối thiểu (%)"
                  rules={[{ required: true }]}
                >
                  <InputNumber min={1} max={70} precision={0} />
                </Form.Item>
              </Space>
            </section>
          </div>
          <section className="mg-form-section mg-variants-section">
            <h3>Biến thể sản phẩm</h3>
            <Form.List name="variants">
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field) => (
                    <div className="mg-variant" key={field.key}>
                      <Form.Item name={[field.name, "id"]} hidden>
                        <Input />
                      </Form.Item>
                      <Form.Item
                        className="mg-variant-image"
                        name={[field.name, "image"]}
                        label="Ảnh biến thể"
                      >
                        <ProductImageInput
                          compact
                          onLoadingChange={(loading) =>
                            setImageLoading(
                              (count) => count + (loading ? 1 : -1),
                            )
                          }
                        />
                      </Form.Item>
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
                        name={[field.name, "oldPrice"]}
                        label="Giá gốc (đ)"
                        tooltip="Để trống nếu không hiển thị giá gốc. Giá gốc phải lớn hơn giá bán."
                        dependencies={[["variants", field.name, "price"]]}
                        rules={[
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              return value == null ||
                                value >
                                  getFieldValue([
                                    "variants",
                                    field.name,
                                    "price",
                                  ])
                                ? Promise.resolve()
                                : Promise.reject(
                                    new Error("Giá gốc phải lớn hơn giá bán"),
                                  );
                            },
                          }),
                        ]}
                      >
                        <InputNumber
                          min={1}
                          precision={0}
                          placeholder="Không áp dụng"
                        />
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
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => add({ label: "", price: 0, stock: 0 })}
                  >
                    Thêm biến thể
                  </Button>
                </>
              )}
            </Form.List>
          </section>
        </Form>
      </Modal>
    </>
  );
}
