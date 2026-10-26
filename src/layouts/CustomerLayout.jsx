import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Badge,
  Button,
  Input,
  Dropdown,
  Drawer,
  Empty,
  Space,
  Popover,
  Tooltip,
  App,
  Alert,
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
import { userError } from "../utils/userError";
import { usePolling } from "../hooks/usePolling";
export default function CustomerLayout() {
  const { t } = useTranslation(),
    shopConfig = useShopConfig(),
    s = useShop(),
    navigate = useNavigate(),
    location = useLocation(),
    { timeZone } = usePreferences();
  const { message } = App.useApp();
  const perform = async (action) => {
    try {
      return await action();
    } catch (error) {
      message.error(t(userError(error)));
    }
  };
  const [chat, setChat] = useState(false),
    [notice, setNotice] = useState(false),
    [draft, setDraft] = useState(""),
    chatEnd = useRef(null);
  const [chatError, setChatError] = useState(null);
  usePolling(
    async () => {
      await s.refreshMessages();
      setChatError(null);
    },
    {
      enabled: !!s.user,
      onError: (error) => setChatError(t(userError(error))),
    },
  );
  const notices = s.notifications.filter((n) => n.owner === s.user?.email),
    messages = s.messages.filter((n) => n.owner === s.user?.email);
  const unreadChat = messages.some(
    (item) => item.from === "shop" && item.is_read !== true,
  );
  useEffect(() => {
    if (chat) chatEnd.current?.scrollIntoView?.({ block: "end" });
  }, [chat, messages.length]);
  const menu = {
    items: [
      { key: "account", label: t("Tài khoản của tôi") },
      { key: "orders", label: t("Đơn mua") },
      { key: "settings", label: t("Cài đặt") },
      ...(s.user?.role === "admin" && s.user.is_active !== false
        ? [{ key: "management", label: t("Quản lý") }]
        : []),
      { key: "logout", label: t("Đăng xuất"), danger: true },
    ],
    onClick: async ({ key }) => {
      if (key === "logout") {
        await perform(s.logout);
        setChat(false);
        setNotice(false);
        setDraft("");
        navigate("/");
      } else navigate("/" + key);
    },
  };
  async function send() {
    if (!draft.trim() || !s.user) return;
    await perform(async () => {
      await s.sendMessage(draft.trim());
      setDraft("");
    });
  }
  const notificationContent = (
    <div className="notification-dropdown">
      <div className="notification-list">
        {notices.length ? (
          notices.map((n) => (
            <button
              className="notice"
              key={n.id}
              onClick={() => {
                perform(() => s.readNotification(n.id));
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
      <Button type="link" onClick={() => perform(s.readAllNotifications)}>
        {t("Đánh dấu tất cả đã đọc")}
      </Button>
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
          <Link to="/shop-info">{t("Thông tin shop")}</Link>
        </nav>
        <HeaderSearch />
        <div className="header-actions">
          {s.user?.role === "admin" && s.user.is_active !== false && (
            <Button onClick={() => navigate("/management")}>
              {t("Quản lý")}
            </Button>
          )}
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
          {s.user && (
            <Link to="/cart" aria-label={t("Giỏ hàng")}>
              <Badge
                count={s.items.reduce((n, i) => n + i.quantity, 0)}
                size="small"
              >
                <ShoppingOutlined style={{ fontSize: 23 }} />
              </Badge>
            </Link>
          )}
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
            aria-label={t("Chat với shop")}
            onClick={() => {
              setChat(true);
              perform(s.openChat);
            }}
          >
            <Badge count={unreadChat ? 1 : 0} size="small" offset={[-2, 2]}>
              <MessageOutlined />
            </Badge>
          </Button>
        </Tooltip>
      )}
      <Drawer
        title={t("Trò chuyện với shop")}
        open={chat}
        onClose={() => {
          s.closeChat();
          setChat(false);
        }}
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
        <div className="chat-log">
          {chatError && <Alert type="error" showIcon title={chatError} />}
          {!messages.length && <Empty description={t("Chưa có tin nhắn")} />}
          {messages.map((m) => (
            <div
              className={m.from === "shop" ? "bubble" : "bubble mine"}
              key={m.id}
            >
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
