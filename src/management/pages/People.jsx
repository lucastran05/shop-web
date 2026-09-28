import { useState } from "react";
import {
  App,
  Button,
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
import { useManagement } from "../context";
import { PageTitle } from "../PageTitle";

export function UsersPage() {
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
      <PageTitle
        title="Quản lý tài khoản"
        description="Thêm tài khoản, cập nhật vai trò và quản lý quyền truy cập."
      />
      <div className="mg-toolbar">
        <Input.Search
          placeholder="Tìm tên hoặc email"
          allowClear
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="primary" onClick={() => edit(null)}>
          Thêm tài khoản
        </Button>
        <Popconfirm
          title="Xóa các tài khoản đã chọn?"
          onConfirm={() => remove(selected)}
        >
          <Button danger disabled={!selected.length}>
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
            render: (_, u) => (
              <Space>
                <Button onClick={() => edit(u)}>Sửa</Button>
                <Popconfirm
                  title="Xóa tài khoản này?"
                  onConfirm={() => remove([u.id])}
                >
                  <Button danger disabled={u.id === s.session.id}>
                    Xóa
                  </Button>
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

export function RolesPage() {
  const rows = [
    ["Quản lý sản phẩm, danh mục", true, true],
    ["Điều chỉnh kho và xem lịch sử", true, true],
    ["Xử lý đơn hàng, vận chuyển", true, true],
    ["Xác nhận thanh toán, hoàn tiền", true, true],
    ["Chat với khách hàng", true, true],
    ["Xem báo cáo", true, true],
    ["Quản lý tài khoản, khóa, phân vai trò", false, true],
  ];
  return (
    <>
      <PageTitle
        title="Phân quyền"
        description="Ma trận quyền của hai vai trò theo yêu cầu nghiệp vụ."
      />
      <Table
        rowKey="name"
        pagination={false}
        dataSource={rows.map(([name, manager, admin]) => ({
          name,
          manager,
          admin,
        }))}
        columns={[
          { title: "Chức năng", dataIndex: "name" },
          {
            title: "Manager",
            dataIndex: "manager",
            render: (value) => (value ? "✓ Có quyền" : "— Không có quyền"),
          },
          { title: "Admin", dataIndex: "admin", render: () => "✓ Có quyền" },
        ]}
      />
    </>
  );
}

export function MessagesPage() {
  const s = useManagement(),
    { message } = App.useApp();
  const [owner, setOwner] = useState(null),
    [draft, setDraft] = useState(""),
    [query, setQuery] = useState("");
  const owners = [...new Set(s.messages.map((m) => m.owner))];
  function send() {
    if (!draft.trim()) return;
    s.reply(owner, draft.trim());
    setDraft("");
    message.success("Đã gửi phản hồi");
  }
  return (
    <>
      <PageTitle
        title="Tin nhắn khách hàng"
        description="Chọn một cuộc hội thoại để xem và trả lời trong popup."
      />
      <div className="mg-toolbar">
        <Input.Search
          placeholder="Tìm email khách hàng"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <Table
        rowKey="owner"
        dataSource={owners
          .filter((o) => o.toLowerCase().includes(query.toLowerCase()))
          .map((owner) => ({
            owner,
            last: s.messages.filter((m) => m.owner === owner).at(-1)?.text,
          }))}
        columns={[
          { title: "Khách hàng", dataIndex: "owner" },
          { title: "Tin nhắn gần nhất", dataIndex: "last", ellipsis: true },
          {
            title: "Thao tác",
            render: (_, r) => (
              <Button
                onClick={() => {
                  setOwner(r.owner);
                  setDraft("");
                }}
              >
                Xem / Trả lời
              </Button>
            ),
          },
        ]}
      />
      <Modal
        title={`Hội thoại · ${owner || ""}`}
        open={!!owner}
        onCancel={() => setOwner(null)}
        footer={null}
        width={650}
      >
        <div className="mg-chat" role="log" aria-label="Lịch sử hội thoại">
          {s.messages
            .filter((m) => m.owner === owner)
            .map((m) => (
              <div
                key={m.id}
                className={
                  m.from === "shop"
                    ? "mg-message mg-message-shop"
                    : "mg-message"
                }
              >
                <strong>{m.from === "shop" ? "Cửa hàng" : "Khách hàng"}</strong>
                <p>{m.text}</p>
              </div>
            ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <Space.Compact block>
            <Input
              aria-label="Nội dung trả lời"
              placeholder="Nhập nội dung trả lời..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={2000}
            />
            <Button type="primary" htmlType="submit" disabled={!draft.trim()}>
              Gửi
            </Button>
          </Space.Compact>
        </form>
      </Modal>
    </>
  );
}
