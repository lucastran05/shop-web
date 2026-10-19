import Button from "../../components/management/ManagementButton";
import { useEffect, useRef, useState } from "react";
import {
  Avatar,
  Badge,
  Empty,
  Form,
  Input,
  Modal,
  AutoComplete,
  Dropdown,
  Segmented,
  Tag,
  Alert,
} from "antd";
import {
  ArrowLeftOutlined,
  SearchOutlined,
  SendOutlined,
  PlusOutlined,
  CheckOutlined,
  MoreOutlined,
  PushpinOutlined,
  MailOutlined,
  DeleteOutlined,
  UndoOutlined,
  ThunderboltOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import { useManagement } from "../../hooks/useManagement";
import { App } from "antd";
import { userError } from "../../utils/userError";
import { usePolling } from "../../hooks/usePolling";

const quickReplies = [
  {
    key: "hello",
    label: "Chào khách",
    text: "Shop xin chào bạn! Shop có thể hỗ trợ gì cho bạn ạ?",
  },
  {
    key: "order",
    label: "Hỏi mã đơn hàng",
    text: "Bạn gửi giúp shop mã đơn hàng để shop kiểm tra nhé.",
  },
  {
    key: "thanks",
    label: "Cảm ơn khách",
    text: "Cảm ơn bạn đã liên hệ. Nếu cần hỗ trợ thêm, bạn cứ nhắn shop nhé!",
  },
];

function dateOf(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}
function timeOf(value) {
  return (
    dateOf(value)?.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    }) || ""
  );
}
export default function MessagesPage() {
  const s = useManagement();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [modal, modalContext] = Modal.useModal();
  const [filter, setFilter] = useState("all");
  const [chatError, setChatError] = useState(null);
  usePolling(
    async () => {
      await s.refreshMessages();
      setChatError(null);
    },
    {
      enabled: !!s.session,
      onError: (error) => setChatError(userError(error)),
    },
  );
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState(null),
    [query, setQuery] = useState(""),
    [drafts, setDrafts] = useState({});
  const log = useRef(null);
  const owners = [...new Set(s.messages.map((m) => m.owner))];
  const displayName = (owner) =>
    s.users.find((u) => u.email === owner)?.name ||
    s.customers.find((c) => c.email === owner)?.name ||
    s.orders.find((o) => o.owner === owner)?.recipient?.name ||
    owner;
  const conversations = owners
    .map((owner) => ({
      owner,
      name: displayName(owner),
      unread: s.messages.filter(
        (m) =>
          m.owner === owner &&
          m.from !== "shop" &&
          !s.readMessageIds.includes(m.id),
      ).length,
      preference: s.chatPreference[owner] || {},
      last: s.messages.filter((m) => m.owner === owner).at(-1),
    }))
    .sort(
      (a, b) =>
        Number(!!b.preference.pinned) - Number(!!a.preference.pinned) ||
        (dateOf(b.last?.at)?.getTime() || 0) -
          (dateOf(a.last?.at)?.getTime() || 0),
    );
  const visibleConversations = conversations.filter(
    (c) =>
      !c.preference.hidden &&
      (filter !== "unread" || c.unread || c.preference.unread) &&
      `${c.owner} ${c.name} ${c.last?.text || ""}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const owner = conversations.some(
    (c) => c.owner === selected && !c.preference.hidden,
  )
    ? selected
    : visibleConversations[0]?.owner;
  function removeConversation(target) {
    modal.confirm({
      title: "Xóa hội thoại?",
      content: `Hội thoại với ${displayName(target)} sẽ được bỏ khỏi danh sách của bạn. Bạn có thể khôi phục sau.`,
      okText: "Xóa hội thoại",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: () => {
        s.updateChatPreference(target, { hidden: true });
        if (selected === target) setSelected(null);
      },
    });
  }
  function conversationMenu(target) {
    const pref = s.chatPreference[target] || {};
    const hasUnread =
      pref.unread || conversations.find((c) => c.owner === target)?.unread;
    return {
      items: [
        {
          key: "pin",
          icon: <PushpinOutlined />,
          label: pref.pinned ? "Bỏ ghim hội thoại" : "Ghim hội thoại",
        },
        {
          key: "read",
          icon: hasUnread ? <CheckOutlined /> : <MailOutlined />,
          label: hasUnread ? "Đánh dấu đã đọc" : "Đánh dấu chưa đọc",
        },
        { type: "divider" },
        {
          key: "delete",
          icon: <DeleteOutlined />,
          label: "Xóa hội thoại",
          danger: true,
        },
      ],
      onClick: ({ key }) => {
        if (key === "pin")
          s.updateChatPreference(target, { pinned: !pref.pinned });
        if (key === "read") (hasUnread ? s.markRead : s.markUnread)(target);
        if (key === "delete") removeConversation(target);
      },
    };
  }
  const messages = s.messages.filter((m) => m.owner === owner);
  const draft = drafts[owner] || "";
  const unread = conversations.find((c) => c.owner === owner)?.unread || 0;
  const markReadRef = useRef(s.markRead);
  useEffect(() => {
    markReadRef.current = s.markRead;
  }, [s.markRead]);
  const incomingIds = messages
    .filter((item) => item.from !== "shop")
    .map((item) => item.id)
    .join(",");
  useEffect(() => {
    if (!selected || selected !== owner) return;
    const readVisibleMessages = () => {
      if (!document.hidden) markReadRef.current(owner);
    };
    readVisibleMessages();
    window.addEventListener("focus", readVisibleMessages);
    document.addEventListener("visibilitychange", readVisibleMessages);
    return () => {
      window.removeEventListener("focus", readVisibleMessages);
      document.removeEventListener("visibilitychange", readVisibleMessages);
    };
  }, [selected, owner, incomingIds]);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [owner, s.messages.length]);
  async function send() {
    if (!owner || !draft.trim()) return;
    try {
      await s.reply(owner, draft.trim());
      setDrafts((old) => ({ ...old, [owner]: "" }));
    } catch (error) {
      message.error(userError(error));
    }
  }
  return (
    <>
      {modalContext}
      {chatError && <Alert type="error" showIcon title={chatError} />}
      <div
        className={`mg-messenger ${selected ? "mg-messenger-selected" : ""}`}
      >
        <aside className="mg-conversations" aria-label="Danh sách hội thoại">
          <div className="mg-inbox-heading">
            <span className="mg-inbox-symbol">
              <MessageOutlined />
            </span>
            <div>
              <strong>Hộp thư</strong>
              <small>
                {conversations.filter((c) => !c.preference.hidden).length} hội
                thoại ·{" "}
                {
                  conversations.filter(
                    (c) =>
                      !c.preference.hidden && (c.unread || c.preference.unread),
                  ).length
                }{" "}
                chưa đọc
              </small>
            </div>
          </div>
          <div className="mg-conversation-search">
            <Button
              type="primary"
              icon={<PlusOutlined aria-hidden="true" />}
              onClick={() => {
                form.resetFields();
                setCreating(true);
              }}
            >
              Thêm hội thoại
            </Button>
            <Input
              prefix={<SearchOutlined />}
              allowClear
              aria-label="Tìm hội thoại"
              placeholder="Tìm tên, email, tin nhắn cuối..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="mg-chat-filters">
            <Segmented
              block
              aria-label="Lọc hội thoại"
              value={filter}
              onChange={setFilter}
              options={[
                { label: "Tất cả", value: "all" },
                { label: "Chưa đọc", value: "unread" },
              ]}
            />
            {conversations.some((c) => c.preference.hidden) && (
              <Dropdown
                trigger={["click"]}
                menu={{
                  items: conversations
                    .filter((c) => c.preference.hidden)
                    .map((c) => ({ key: c.owner, label: c.name })),
                  onClick: ({ key }) => {
                    s.updateChatPreference(key, { hidden: false });
                    setSelected(key);
                    setFilter("all");
                    setQuery("");
                  },
                }}
              >
                <Button
                  type="text"
                  icon={<UndoOutlined />}
                  aria-label="Khôi phục hội thoại"
                >
                  Khôi phục hội thoại
                </Button>
              </Dropdown>
            )}
          </div>
          <div className="mg-conversation-list">
            {visibleConversations.map((c) => (
              <div
                key={c.owner}
                className={`mg-conversation-row ${c.unread || c.preference.unread ? "mg-conversation-unread" : ""}`}
              >
                <button
                  key={c.owner}
                  className={`mg-conversation ${owner === c.owner ? "active" : ""}`}
                  onClick={() => {
                    setSelected(c.owner);
                    s.markRead(c.owner);
                  }}
                  aria-pressed={owner === c.owner}
                >
                  <Badge
                    count={c.unread || (c.preference.unread ? 1 : 0)}
                    size="small"
                    title={
                      c.unread
                        ? `${c.unread} tin chưa đọc`
                        : c.preference.unread
                          ? "Đã đánh dấu chưa đọc"
                          : "Đã đọc"
                    }
                  >
                    <Avatar size={42} className="mg-chat-avatar">
                      {c.name.charAt(0).toUpperCase()}
                    </Avatar>
                  </Badge>
                  <span className="mg-conversation-text">
                    <span className="mg-conversation-heading">
                      <strong>
                        {c.preference.pinned && (
                          <PushpinOutlined aria-label="Đã ghim" />
                        )}{" "}
                        {c.name}
                      </strong>
                      <time>{timeOf(c.last?.at)}</time>
                    </span>
                    <span className="mg-last-message">
                      {c.last?.from === "shop" ? "Bạn: " : ""}
                      {c.last?.text}
                    </span>
                  </span>
                </button>
                <Dropdown trigger={["click"]} menu={conversationMenu(c.owner)}>
                  <Button
                    className="mg-conversation-more"
                    type="text"
                    icon={<MoreOutlined />}
                    aria-label={`Tùy chọn hội thoại ${c.name}`}
                  />
                </Dropdown>
              </div>
            ))}
            {!visibleConversations.length && (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Không có hội thoại"
              />
            )}
          </div>
        </aside>
        <section className="mg-chat-panel" aria-label="Cuộc trò chuyện">
          {owner ? (
            <>
              <header className="mg-chat-header">
                <Button
                  className="mg-chat-back"
                  type="text"
                  icon={<ArrowLeftOutlined />}
                  aria-label="Về danh sách hội thoại"
                  onClick={() => setSelected(null)}
                />
                <Avatar size={42} className="mg-chat-avatar">
                  {displayName(owner).charAt(0).toUpperCase()}
                </Avatar>
                <div>
                  <strong>{displayName(owner)}</strong>
                  <small>{owner}</small>
                </div>
                <div className="mg-chat-header-actions">
                  <Tag
                    color={
                      unread || s.chatPreference[owner]?.unread
                        ? "blue"
                        : "default"
                    }
                  >
                    {unread || s.chatPreference[owner]?.unread
                      ? "Chưa đọc"
                      : "Đã đọc"}
                  </Tag>
                  <Button
                    type="text"
                    icon={<CheckOutlined />}
                    aria-label="Đánh dấu đã đọc"
                    disabled={!unread && !s.chatPreference[owner]?.unread}
                    onClick={() => s.markRead(owner)}
                  />
                  <Dropdown trigger={["click"]} menu={conversationMenu(owner)}>
                    <Button
                      type="text"
                      icon={<MoreOutlined />}
                      aria-label="Tùy chọn hội thoại"
                    />
                  </Dropdown>
                </div>
              </header>
              <div
                ref={log}
                className="mg-message-list"
                role="log"
                aria-label="Lịch sử hội thoại"
                aria-live="polite"
              >
                {messages.map((m, i) => {
                  const day =
                    dateOf(m.at)?.toLocaleDateString("vi-VN") ||
                    "Tin nhắn trước đây";
                  const previous = i
                    ? dateOf(messages[i - 1].at)?.toLocaleDateString("vi-VN") ||
                      "Tin nhắn trước đây"
                    : null;
                  return (
                    <div key={m.id}>
                      {day !== previous && (
                        <div className="mg-chat-date">
                          <span>{day}</span>
                        </div>
                      )}
                      <div
                        className={`mg-bubble ${m.from === "shop" ? "mg-bubble-out" : ""}`}
                      >
                        <p>{m.text}</p>
                        {m.at && <time>{timeOf(m.at)}</time>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <form
                className="mg-chat-composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <Dropdown
                  trigger={["click"]}
                  placement="topLeft"
                  menu={{
                    items: quickReplies.map(({ key, label }) => ({
                      key,
                      label,
                    })),
                    onClick: ({ key }) => {
                      const text = quickReplies.find(
                        (reply) => reply.key === key,
                      ).text;
                      setDrafts((old) => ({
                        ...old,
                        [owner]:
                          `${old[owner] ? old[owner] + "\n" : ""}${text}`.slice(
                            0,
                            2000,
                          ),
                      }));
                    },
                  }}
                >
                  <Button
                    type="text"
                    icon={<ThunderboltOutlined />}
                    aria-label="Trả lời nhanh"
                  />
                </Dropdown>
                <Input.TextArea
                  aria-label="Nội dung trả lời"
                  placeholder="Nhập tin nhắn..."
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  value={draft}
                  maxLength={2000}
                  onChange={(e) =>
                    setDrafts((old) => ({ ...old, [owner]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey &&
                      !e.nativeEvent.isComposing
                    ) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <Button
                  htmlType="submit"
                  type="primary"
                  shape="circle"
                  icon={<SendOutlined />}
                  aria-label="Gửi tin nhắn"
                  disabled={!draft.trim()}
                />
              </form>
            </>
          ) : (
            <>
              {selected && (
                <header className="mg-chat-header">
                  <Button
                    className="mg-chat-back"
                    type="text"
                    icon={<ArrowLeftOutlined />}
                    aria-label="Về danh sách hội thoại"
                    onClick={() => setSelected(null)}
                  />
                </header>
              )}
              <div className="mg-chat-empty">
                <Empty description="Chưa có tin nhắn" />
              </div>
            </>
          )}
        </section>
      </div>
      <Modal
        title="Thêm hội thoại"
        open={creating}
        onCancel={() => setCreating(false)}
        onOk={() => form.submit()}
        okText="Gửi tin nhắn"
        cancelText="Hủy"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={({ email, text }) => {
            const recipient = email.trim().toLowerCase();
            s.reply(recipient, text.trim()).catch((error) =>
              message.error(userError(error)),
            );
            setSelected(recipient);
            setQuery("");
            setFilter("all");
            setCreating(false);
          }}
        >
          <Form.Item
            name="email"
            label="Email khách hàng"
            rules={[
              {
                required: true,
                type: "email",
                message: "Nhập email khách hàng hợp lệ",
              },
            ]}
          >
            <AutoComplete
              options={[
                ...new Map(
                  s.customers
                    .filter((c) => c.email)
                    .map((c) => [
                      c.email,
                      {
                        value: c.email,
                        label: `${c.name || c.email} · ${c.email}`,
                      },
                    ]),
                ).values(),
              ]}
              filterOption={(input, option) =>
                option.label.toLowerCase().includes(input.toLowerCase())
              }
              placeholder="Chọn hoặc nhập email khách hàng"
            />
          </Form.Item>
          <Form.Item
            name="text"
            label="Tin nhắn đầu tiên"
            rules={[
              {
                required: true,
                whitespace: true,
                message: "Nhập nội dung tin nhắn",
              },
            ]}
          >
            <Input.TextArea rows={4} maxLength={2000} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
