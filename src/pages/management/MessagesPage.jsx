import Button from "../../components/management/ManagementButton";
import { useEffect, useRef, useState } from "react";
import { Avatar, Empty, Input } from "antd";
import {
  ArrowLeftOutlined,
  SearchOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { useManagement } from "../../hooks/useManagement";

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
  const [selected, setSelected] = useState(null),
    [query, setQuery] = useState(""),
    [drafts, setDrafts] = useState({});
  const log = useRef(null);
  const owners = [...new Set(s.messages.map((m) => m.owner))];
  const displayName = (owner) =>
    s.users.find((u) => u.email === owner)?.name ||
    s.orders.find((o) => o.owner === owner)?.recipient?.name ||
    owner;
  const conversations = owners
    .map((owner) => ({
      owner,
      name: displayName(owner),
      last: s.messages.filter((m) => m.owner === owner).at(-1),
    }))
    .sort(
      (a, b) =>
        (dateOf(b.last?.at)?.getTime() || 0) -
        (dateOf(a.last?.at)?.getTime() || 0),
    );
  const owner = selected || conversations[0]?.owner;
  const messages = s.messages.filter((m) => m.owner === owner);
  const draft = drafts[owner] || "";
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [owner, s.messages.length]);
  function send() {
    if (!owner || !draft.trim()) return;
    s.reply(owner, draft.trim());
    setDrafts((old) => ({ ...old, [owner]: "" }));
  }
  return (
    <>
      <div
        className={`mg-messenger ${selected ? "mg-messenger-selected" : ""}`}
      >
        <aside className="mg-conversations" aria-label="Danh sách hội thoại">
          <div className="mg-conversation-search">
            <Input
              prefix={<SearchOutlined />}
              allowClear
              aria-label="Tìm hội thoại"
              placeholder="Tìm khách hàng..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="mg-conversation-list">
            {conversations
              .filter((c) =>
                `${c.owner} ${c.name}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((c) => (
                <button
                  key={c.owner}
                  className={`mg-conversation ${owner === c.owner ? "active" : ""}`}
                  onClick={() => setSelected(c.owner)}
                  aria-pressed={owner === c.owner}
                >
                  <Avatar size={42} className="mg-chat-avatar">
                    {c.name.charAt(0).toUpperCase()}
                  </Avatar>
                  <span className="mg-conversation-text">
                    <span className="mg-conversation-heading">
                      <strong>{c.name}</strong>
                      <time>{timeOf(c.last?.at)}</time>
                    </span>
                    <span className="mg-last-message">
                      {c.last?.from === "shop" ? "Bạn: " : ""}
                      {c.last?.text}
                    </span>
                  </span>
                </button>
              ))}
            {!conversations.some((c) =>
              `${c.owner} ${c.name}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            ) && (
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
            <div className="mg-chat-empty">
              <Empty description="Chưa có tin nhắn" />
            </div>
          )}
        </section>
      </div>
    </>
  );
}
