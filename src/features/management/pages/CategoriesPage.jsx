import Button from "../components/ManagementButton";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useState } from "react";
import { App, Form, Input, Modal, Popconfirm, Space, Table } from "antd";
import { useManagement } from "../hooks/useManagement";
import { userError } from "../../../shared/utils/userError";

export default function CategoriesPage() {
  const s = useManagement(),
    { message } = App.useApp(),
    [form] = Form.useForm();
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [editing, setEditing] = useState(null),
    [selected, setSelected] = useState([]);
  function edit(name) {
    setEditing(name);
    form.setFieldsValue({ name: name || "" });
    setOpen(true);
  }
  async function remove(names) {
    if (s.products.some((p) => names.includes(p.category)))
      return message.error(
        "Danh mục đang có sản phẩm, hãy chuyển sản phẩm trước khi xóa.",
      );
    try {
      await s.removeCategories(names);
    } catch (error) {
      message.error(userError(error));
      return;
    }
    setSelected([]);
  }
  async function save({ name }) {
    name = name.trim();
    if (s.categories.includes(name) && name !== editing)
      return message.error("Tên danh mục đã tồn tại");
    try {
      await s.saveCategory(name, editing);
    } catch (error) {
      message.error(userError(error));
      return;
    }
    setSelected([]);
    setOpen(false);
  }
  return (
    <>
      <div className="mg-toolbar">
        <Input.Search
          allowClear
          aria-label="Tìm danh mục"
          placeholder="Tìm danh mục"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected([]);
          }}
        />
        <Button
          type="primary"
          icon={<PlusOutlined aria-hidden="true" />}
          onClick={() => edit(null)}
        >
          Thêm danh mục
        </Button>
        <Popconfirm
          title="Xóa các danh mục đã chọn?"
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
        rowKey="name"
        rowSelection={{ selectedRowKeys: selected, onChange: setSelected }}
        dataSource={s.categories
          .filter((name) =>
            name.toLowerCase().includes(query.trim().toLowerCase()),
          )
          .map((name) => ({ name }))}
        columns={[
          { title: "Tên danh mục", dataIndex: "name" },
          {
            title: "Số sản phẩm",
            render: (_, r) =>
              s.products.filter((p) => p.category === r.name).length,
          },
          {
            title: "Thao tác",
            align: "center",
            width: 112,
            className: "mg-action-cell",
            render: (_, r) => (
              <Space>
                <Button
                  icon={<EditOutlined aria-hidden="true" />}
                  onClick={() => edit(r.name)}
                  aria-label="Sửa"
                  title="Sửa"
                  className="mg-icon-action"
                />
                <Popconfirm
                  title="Xóa danh mục?"
                  onConfirm={() => remove([r.name])}
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
