import { useEffect, useRef, useState } from "react";
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
  Popover,
  Select,
  Tooltip,
} from "antd";
import {
  ShoppingOutlined,
  UserOutlined,
  BellOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useShop } from "../hooks/useShop";
import { useShopConfig } from "../hooks/useShopConfig";
import { usePreferences } from "../hooks/usePreferences";
import { formatDateTime } from "../utils/format";
import HeaderSearch from "../components/HeaderSearch";
export default function CustomerLayout() {
  const { t, i18n } = useTranslation(),
    shopConfig = useShopConfig(),
    s = useShop(),
    navigate = useNavigate(),
    location = useLocation(),
    { message } = App.useApp(),
    { timeZone } = usePreferences();
  const [chat, setChat] = useState(false),
    [notice, setNotice] = useState(false),
    [draft, setDraft] = useState(""),
    chatEnd = useRef(null);
  const notices = s.notifications.filter((n) => n.owner === s.user?.email),
    messages = s.messages.filter((n) => n.owner === s.user?.email);
  useEffect(() => {
    if (chat) chatEnd.current?.scrollIntoView?.({ block: "end" });
  }, [chat, messages.length]);
  const menu = {
    items: [
      { key: "account", label: t("Tài khoản của tôi") },
      { key: "orders", label: t("Đơn mua") },
      { key: "logout", label: t("Đăng xuất"), danger: true },
    ],
    onClick: ({ key }) => {
      if (key === "logout") {
        s.setUser(null);
        setChat(false);
        setNotice(false);
        setDraft("");
        navigate("/");
      } else navigate("/" + key);
    },
  };
  function send() {
    if (!draft.trim() || !s.user) return;
    s.setMessages((old) => [
      ...old,
      {
        id: crypto.randomUUID(),
        owner: s.user.email,
        text: draft.trim(),
        createdAt: new Date().toISOString(),
      },
    ]);
    setDraft("");
    message.info(t("Đã lưu tin nhắn demo. Chưa kết nối nhân viên shop."));
  }
  const notificationContent = (
    <div className="notification-dropdown">
      <Button
        type="link"
        onClick={() =>
          s.setNotifications((old) =>
            old.map((n) =>
              n.owner === s.user?.email ? { ...n, read: true } : n,
            ),
          )
        }
      >
        {t("Đánh dấu tất cả đã đọc")}
      </Button>
      <div className="notification-list">
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
              {!n.read && <Badge status="processing" />}{" "}
              {n.key ? t(n.key, n.params) : n.text}
              {n.createdAt && (
                <time>{formatDateTime(n.createdAt, timeZone)}</time>
              )}
            </button>
          ))
        ) : (
          <Empty description={t("Chưa có thông báo")} />
        )}
      </div>
    </div>
  );
  return (
    <>
      <header className="header">
        <Link to="/" className="logo">
          {shopConfig.name}
        </Link>
        <nav>
          <Link className={location.pathname === "/" ? "active" : ""} to="/">
            {t("Trang chủ")}
          </Link>
          <Link to="/?featured=true">{t("Nổi bật")}</Link>
          <Link to="/shop-info">{t("Thông tin shop")}</Link>
        </nav>
        <HeaderSearch />
        <div className="header-actions">
          <Select
            aria-label={t("Ngôn ngữ")}
            className="language-select"
            value={i18n.resolvedLanguage === "en" ? "en" : "vi"}
            onChange={(lng) => i18n.changeLanguage(lng)}
            options={[
              { value: "vi", label: "VI" },
              { value: "en", label: "EN" },
            ]}
          />
          {s.user ? (
            <>
              <Popover
                title={t("Thông báo của bạn")}
                trigger="click"
                placement="bottomRight"
                open={notice}
                onOpenChange={setNotice}
                content={notificationContent}
              >
                <Button aria-label={t("Thông báo")} type="text">
                  <Badge
                    count={notices.filter((n) => !n.read).length}
                    size="small"
                  >
                    <BellOutlined />
                  </Badge>
                </Button>
              </Popover>
              <Dropdown menu={menu} trigger={["click"]}>
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
              {t("Đăng nhập")}
            </Button>
          )}
          <Link to="/cart" aria-label={t("Giỏ hàng")}>
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
      <footer className="site-footer">
        <div>
          <Link to="/" className="logo">
            {shopConfig.name}
          </Link>
          <p>{t(shopConfig.description)}</p>
        </div>
        <div>
          <h4>{t("Thông tin khách hàng")}</h4>
          <Link to="/">{t("Sản phẩm")}</Link>
          <Link to="/orders">{t("Theo dõi đơn hàng")}</Link>
          <Link to="/account">{t("Tài khoản")}</Link>
        </div>
        <div>
          <h4>{t("Liên hệ")}</h4>
          <Link to="/shop-info">{t("Thông tin shop")}</Link>
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
        </div>
        <div className="copyright">
          © {new Date().getFullYear()} {shopConfig.name}
        </div>
      </footer>
      {s.user && (
        <Tooltip title={t("Chat với shop")}>
          <Button
            className="chat-trigger"
            type="primary"
            shape="circle"
            icon={<MessageOutlined />}
            aria-label={t("Chat với shop")}
            onClick={() => setChat(true)}
          />
        </Tooltip>
      )}
      <Drawer
        title={t("Trò chuyện với shop")}
        open={chat}
        onClose={() => setChat(false)}
        footer={
          <Space.Compact style={{ width: "100%" }}>
            <Input
              aria-label={t("Nội dung tin nhắn")}
              maxLength={1000}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onPressEnter={(e) => {
                if (!e.nativeEvent.isComposing) send();
              }}
              placeholder={t("Nhập tin nhắn…")}
            />
            <Button type="primary" disabled={!draft.trim()} onClick={send}>
              {t("Gửi")}
            </Button>
          </Space.Compact>
        }
      >
        <Tag color="gold">{t("Mô phỏng — chưa có nhân viên trực tuyến")}</Tag>
        <div className="chat-log">
          <p className="bubble">
            {t("Chào bạn! Shop có thể hỗ trợ gì cho bạn?")}
          </p>
          {messages.map((m) => (
            <div className="bubble mine" key={m.id}>
              <p>{m.text}</p>
              {m.createdAt && (
                <time dateTime={m.createdAt}>
                  {formatDateTime(m.createdAt, timeZone)}
                </time>
              )}
            </div>
          ))}
          <div ref={chatEnd} />
        </div>
      </Drawer>
    </>
  );
}
