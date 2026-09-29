import Button from "../../components/management/ManagementButton";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useState } from "react";
import {
  App,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from "antd";
import { useManagement } from "../../hooks/useManagement";

export default function UsersPage() {
  const s = useManagement(),
    { message } = App.useApp(),
    [form] = Form.useForm();
  const [query, setQuery] = useState(""),
    [selected, setSelected] = useState([]),
    [editing, setEditing] = useState(null),
    [open, setOpen] = useState(false);
  function edit(user) {
    setEditing(user);
    form.resetFields();
    form.setFieldsValue(user || { role: "manager", active: true });
    setOpen(true);
  }
  function save(values) {
    if (s.session.role !== "admin") return;
    const email = values.email.trim().toLowerCase();
    if (s.users.some((u) => u.email === email && u.id !== editing?.id))
      return message.error("Email đã tồn tại");
    if (
      editing?.id === s.session.id &&
      (values.role !== "admin" || !values.active)
    )
      return message.error("Không thể khóa hoặc hạ quyền tài khoản đang dùng.");
    const user = {
      ...values,
      name: values.name.trim(),
      email,
      id: editing?.id || crypto.randomUUID(),
    };
    s.setUsers((old) =>
      editing
        ? old.map((u) => (u.id === editing.id ? user : u))
        : [...old, user],
    );
    setOpen(false);
    message.success("Đã lưu tài khoản");
  }
  function remove(ids) {
    if (ids.includes(s.session.id))
      return message.error("Không thể xóa tài khoản đang dùng.");
    s.setUsers((old) => old.filter((u) => !ids.includes(u.id)));
    setSelected([]);
  }
  return (
    <>
      <div className="mg-toolbar">
        <Input.Search
          placeholder="Tìm tên hoặc email"
          allowClear
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button
          type="primary"
          icon={<PlusOutlined aria-hidden="true" />}
          onClick={() => edit(null)}
        >
          Thêm tài khoản
        </Button>
        <Popconfirm
          title="Xóa các tài khoản đã chọn?"
          onConfirm={() => remove(selected)}
        >
          <Button
            icon={<DeleteOutlined aria-hidden="true" />}
            danger
            disabled={!selected.length}
          >
            Xóa đã chọn
          </Button>
        </Popconfirm>
      </div>
      <Table
        rowKey="id"
        rowSelection={{
          selectedRowKeys: selected,
          onChange: setSelected,
          getCheckboxProps: (u) => ({ disabled: u.id === s.session.id }),
        }}
        dataSource={s.users.filter((u) =>
          `${u.name} ${u.email}`.toLowerCase().includes(query.toLowerCase()),
        )}
        scroll={{ x: 750 }}
        columns={[
          { title: "Họ tên", dataIndex: "name" },
          { title: "Email", dataIndex: "email" },
          {
            title: "Vai trò",
            dataIndex: "role",
            render: (role) => <Tag color="blue">{role}</Tag>,
          },
          {
            title: "Trạng thái",
            dataIndex: "active",
            render: (active) => (active ? "Hoạt động" : "Đã khóa"),
          },
          {
            title: "Thao tác",
            align: "center",
            width: 112,
            className: "mg-action-cell",
            render: (_, u) => (
              <Space>
                <Button
                  icon={<EditOutlined aria-hidden="true" />}
                  onClick={() => edit(u)}
                  aria-label="Sửa"
                  title="Sửa"
                  className="mg-icon-action"
                />
                <Popconfirm
                  title="Xóa tài khoản này?"
                  onConfirm={() => remove([u.id])}
                >
                  <Button
                    icon={<DeleteOutlined aria-hidden="true" />}
                    danger
                    disabled={u.id === s.session.id}
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
        title={editing ? "Sửa tài khoản" : "Thêm tài khoản"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item
            name="name"
            label="Họ tên"
            rules={[
              { required: true, whitespace: true, message: "Nhập họ tên" },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, type: "email", message: "Nhập email hợp lệ" },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}>
            <Select
              disabled={editing?.id === s.session.id}
              options={["customer", "manager", "admin"].map((value) => ({
                value,
              }))}
            />
          </Form.Item>
          <Form.Item name="active" label="Hoạt động" valuePropName="checked">
            <Switch disabled={editing?.id === s.session.id} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
