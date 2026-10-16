import Button from "../../components/management/ManagementButton";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  KeyOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
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
import { passwordCredential, temporaryPassword } from "../../utils/password";

const roleLabels = {
  customer: "Khách hàng",
  manager: "Quản lý cửa hàng",
  admin: "Quản trị viên",
};

export default function UsersPage() {
  const s = useManagement(),
    { message } = App.useApp(),
    [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [passwordUser, setPasswordUser] = useState(null);
  const [saving, setSaving] = useState(false);
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
  async function save(values) {
    if (s.session.role !== "admin") return;
    const email = values.email.trim().toLowerCase();
    if (s.users.some((u) => u.email === email && u.id !== editing?.id))
      return message.error("Email đã tồn tại");
    if (
      editing?.id === s.session.id &&
      (values.role !== "admin" || !values.active)
    )
      return message.error("Không thể khóa hoặc hạ quyền tài khoản đang dùng.");
    const { password, ...fields } = values;
    const user = {
      ...editing,
      ...fields,
      name: values.name.trim(),
      email,
      id: editing?.id || crypto.randomUUID(),
    };
    if (password) {
      try {
        user.credential = await passwordCredential(password);
      } catch {
        return message.error("Không thể lưu mật khẩu. Vui lòng thử lại.");
      }
    }
    s.setUsers((old) =>
      editing
        ? old.map((u) => (u.id === editing.id ? user : u))
        : [...old, user],
    );
    setOpen(false);
    message.success("Đã lưu tài khoản");
  }
  function remove(ids) {
    if (s.session.role !== "admin") return;
    if (ids.includes(s.session.id))
      return message.error("Không thể xóa tài khoản đang dùng.");
    s.setUsers((old) => old.filter((u) => !ids.includes(u.id)));
    setSelected([]);
    message.success("Đã xóa tài khoản");
  }
  async function savePassword({ password }) {
    if (s.session.role !== "admin") return;
    setSaving(true);
    try {
      const credential = await passwordCredential(password);
      s.setUsers((old) =>
        old.map((user) =>
          user.id === passwordUser.id ? { ...user, credential } : user,
        ),
      );
      setPasswordUser(null);
      passwordForm.resetFields();
      message.success("Đã cập nhật mật khẩu");
    } catch {
      message.error("Không thể lưu mật khẩu. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
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
            render: (role) => (
              <Tag color="blue">{roleLabels[role] || "Chưa xác định"}</Tag>
            ),
          },
          {
            title: "Trạng thái",
            dataIndex: "active",
            render: (active) => (active ? "Hoạt động" : "Đã khóa"),
          },
          {
            title: "Thao tác",
            align: "center",
            width: 156,
            className: "mg-action-cell",
            render: (_, u) => (
              <Space>
                <Button
                  icon={<KeyOutlined />}
                  className="mg-icon-action"
                  aria-label={`Đặt hoặc reset mật khẩu ${u.email}`}
                  title="Đặt / reset mật khẩu"
                  onClick={() => {
                    passwordForm.resetFields();
                    setPasswordUser(u);
                  }}
                />
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
                label: roleLabels[value],
              }))}
            />
          </Form.Item>
          {!editing && (
            <Form.Item
              name="password"
              label="Mật khẩu"
              rules={[
                { required: true, message: "Nhập mật khẩu" },
                { min: 6, message: "Tối thiểu 6 ký tự" },
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          )}
          <Form.Item name="active" label="Hoạt động" valuePropName="checked">
            <Switch disabled={editing?.id === s.session.id} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="Đặt / reset mật khẩu"
        open={!!passwordUser}
        onCancel={() => {
          if (!saving) setPasswordUser(null);
        }}
        onOk={() => passwordForm.submit()}
        confirmLoading={saving}
        okText="Lưu mật khẩu"
        cancelText="Hủy"
        destroyOnHidden
      >
        <p>
          {passwordUser?.name} · {passwordUser?.email}
        </p>
        <Form form={passwordForm} layout="vertical" onFinish={savePassword}>
          <Form.Item
            name="password"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: "Nhập mật khẩu mới" },
              { min: 6, message: "Tối thiểu 6 ký tự" },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirm"
            label="Nhập lại mật khẩu"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Nhập lại mật khẩu" },
              ({ getFieldValue }) => ({
                validator: (_, value) =>
                  !value || value === getFieldValue("password")
                    ? Promise.resolve()
                    : Promise.reject(new Error("Mật khẩu không khớp")),
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              const password = temporaryPassword();
              passwordForm.setFieldsValue({ password, confirm: password });
            }}
          >
            Tạo mật khẩu mới
          </Button>
        </Form>
      </Modal>
    </>
  );
}
