import { useShopConfig } from "../hooks/useShopConfig";
import { useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Badge,
  Button,
  Input,
  Dropdown,
  Drawer,
  Empty,
  Tag,
  Space,
  App,
} from "antd";
import {
  ShoppingOutlined,
  UserOutlined,
  BellOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import { useShop } from "../hooks/useShop";
export default function CustomerLayout() {
  const shopConfig = useShopConfig();
  const s = useShop(),
    navigate = useNavigate(),
    location = useLocation(),
    { message } = App.useApp();
  const [chat, setChat] = useState(false),
    [notice, setNotice] = useState(false),
    [draft, setDraft] = useState("");
  const notices = s.notifications.filter((n) => n.owner === s.user?.email),
    messages = s.messages.filter((n) => n.owner === s.user?.email);
  const menu = {
    items: [
      { key: "account", label: "Tài khoản của tôi" },
      { key: "orders", label: "Đơn mua" },
      { key: "logout", label: "Đăng xuất" },
    ],
    onClick: ({ key }) => {
      if (key === "logout") {
        s.setUser(null);
        setChat(false);
        navigate("/");
      } else navigate("/" + key);
    },
  };
  function send() {
    if (!draft.trim()) return;
    s.setMessages((old) => [
      ...old,
      { id: crypto.randomUUID(), owner: s.user.email, text: draft.trim() },
    ]);
    setDraft("");
    message.info("Đã lưu tin nhắn demo. Chưa kết nối nhân viên shop.");
  }
  return (
    <>
      <header className="header">
        <Link to="/" className="logo">
          {shopConfig.name}
        </Link>
        <nav>
          <Link className={location.pathname === "/" ? "active" : ""} to="/">
            Trang chủ
          </Link>
          <Link to="/?featured=true">Nổi bật</Link>
          <a href="#contact">Thông tin shop</a>
        </nav>
        <Input.Search
          className="header-search"
          aria-label="Tìm kiếm sản phẩm"
          placeholder="Bạn đang tìm gì?"
          onSearch={(value) => navigate("/?q=" + encodeURIComponent(value))}
        />
        <div className="header-actions">
          {s.user ? (
            <>
              <Button
                aria-label="Thông báo"
                type="text"
                onClick={() => setNotice(true)}
              >
                <Badge
                  count={notices.filter((n) => !n.read).length}
                  size="small"
                >
                  <BellOutlined />
                </Badge>
              </Button>
              <Dropdown menu={menu}>
                <Button type="text" icon={<UserOutlined />}>
                  {s.user.name.split(" ").at(-1)}
                </Button>
              </Dropdown>
            </>
          ) : (
            <Button
              type="text"
              icon={<UserOutlined />}
              onClick={() => navigate("/login")}
            >
              Đăng nhập
            </Button>
          )}
          <Link to="/cart" aria-label="Giỏ hàng">
            <Badge
              count={s.items.reduce((n, i) => n + i.quantity, 0)}
              size="small"
            >
              <ShoppingOutlined style={{ fontSize: 23 }} />
            </Badge>
          </Link>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer id="contact">
        <div>
          <Link to="/" className="logo">
            {shopConfig.name}
          </Link>
          <p>{shopConfig.description}</p>
        </div>
        <div>
          <h4>Thông tin khách hàng</h4>
          <Link to="/">Sản phẩm</Link>
          <Link to="/orders">Theo dõi đơn hàng</Link>
          <Link to="/account">Tài khoản</Link>
        </div>
        <div>
          <h4>Liên hệ</h4>
          {shopConfig.contact.address && <p>{shopConfig.contact.address}</p>}
          {shopConfig.contact.phone && (
            <a href={"tel:" + shopConfig.contact.phone}>
              {shopConfig.contact.phone}
            </a>
          )}
          {shopConfig.contact.email && (
            <a href={"mailto:" + shopConfig.contact.email}>
              {shopConfig.contact.email}
            </a>
          )}
          {shopConfig.contact.mapUrl && (
            <a
              href={shopConfig.contact.mapUrl}
              target="_blank"
              rel="noreferrer"
            >
              Xem địa chỉ trên Google Maps
            </a>
          )}
          {shopConfig.contact.socialLinks.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          ))}
          {!shopConfig.contact.address &&
            !shopConfig.contact.phone &&
            !shopConfig.contact.email && (
              <p>Thông tin liên hệ đang được cập nhật.</p>
            )}
        </div>
        <div className="copyright">
          © {new Date().getFullYear()} {shopConfig.name}
        </div>
      </footer>
      {s.user && (
        <Button
          className="chat-trigger"
          type="primary"
          shape="round"
          icon={<MessageOutlined />}
          onClick={() => setChat(true)}
        >
          Chat với shop
        </Button>
      )}
      <Drawer
        title="Thông báo của bạn"
        open={notice}
        onClose={() => setNotice(false)}
      >
        <Button
          onClick={() =>
            s.setNotifications((old) =>
              old.map((n) =>
                n.owner === s.user?.email ? { ...n, read: true } : n,
              ),
            )
          }
        >
          Đánh dấu tất cả đã đọc
        </Button>
        {notices.length ? (
          notices.map((n) => (
            <button
              className="notice"
              key={n.id}
              onClick={() => {
                s.setNotifications((old) =>
                  old.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
                );
                setNotice(false);
                navigate("/orders");
              }}
            >
              {!n.read && <Badge status="processing" />} {n.text}
            </button>
          ))
        ) : (
          <Empty description="Chưa có thông báo" />
        )}
      </Drawer>
      <Drawer
        title="Trò chuyện với shop"
        open={chat}
        onClose={() => setChat(false)}
      >
        <Tag color="gold">Mô phỏng — chưa có nhân viên trực tuyến</Tag>
        <div className="chat-log">
          <p className="bubble">Chào bạn! Shop có thể hỗ trợ gì cho bạn?</p>
          {messages.map((m) => (
            <p className="bubble mine" key={m.id}>
              {m.text}
            </p>
          ))}
        </div>
        <Space.Compact style={{ width: "100%" }}>
          <Input
            aria-label="Nội dung tin nhắn"
            maxLength={1000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onPressEnter={send}
            placeholder="Nhập tin nhắn…"
          />
          <Button type="primary" onClick={send}>
            Gửi
          </Button>
        </Space.Compact>
      </Drawer>
    </>
  );
}
