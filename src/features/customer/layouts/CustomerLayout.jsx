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
  EnvironmentOutlined,
  PhoneOutlined,
  MailOutlined,
  LinkOutlined,
  ExpandOutlined,
  ShrinkOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useShop } from "../../../shared/shop/useShop";
import { useShopConfig } from "../../../shared/shop/useShopConfig";
import { usePreferences } from "../../../shared/preferences/usePreferences";
import { formatDateTime } from "../../../shared/utils/format";
import HeaderSearch from "../components/HeaderSearch";
import ShopMap from "../components/ShopMap";
import { userError } from "../../../shared/utils/userError";
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
  const [chatWidth, setChatWidth] = useState(378);
  function resizeChat(width) {
    setChatWidth(Math.min(window.innerWidth, Math.max(320, width)));
  }
  const chatSizeLabel = t(
    chatWidth > 400 ? "Thu hẹp khung chat" : "Mở rộng khung chat",
  );
  const chatError = s.chatError ? t(s.chatError) : null;
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
      ...(["admin", "manager"].includes(s.user?.role) &&
      s.user.is_active !== false
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
          <img src="/logo/logo.svg" alt="" width="44" height="40" />
          {shopConfig.name}
        </Link>
        <nav>
          <Link className={location.pathname === "/" ? "active" : ""} to="/">
            {t("Trang chủ")}
          </Link>
          <Link to="/shop-info">{t("Thông tin")}</Link>
        </nav>
        <HeaderSearch key={location.pathname + location.search} />
        <div className="header-actions">
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
        <div className="footer-brand">
          <Link to="/" className="logo">
            <img src="/logo/logo.svg" alt="" width="44" height="40" />
            {shopConfig.name}
          </Link>
          <p>{t(shopConfig.description)}</p>
          <div className="footer-socials">
            {shopConfig.contact.socialLinks.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <LinkOutlined aria-hidden="true" /> {link.label}
              </a>
            ))}
          </div>
        </div>
        <div>
          <h4>{t("Thông tin khách hàng")}</h4>
          <Link to="/">{t("Sản phẩm")}</Link>
          <Link to="/orders">{t("Theo dõi đơn hàng")}</Link>
          <Link to="/account">{t("Tài khoản")}</Link>
          <Link to="/settings">{t("Cài đặt")}</Link>
        </div>
        <div>
          <h4>{t("Liên hệ")}</h4>
          <Link to="/shop-info">{t("Thông tin")}</Link>
          {shopConfig.contact.address && (
            <p className="footer-address">
              <EnvironmentOutlined aria-hidden="true" />{" "}
              {shopConfig.contact.address}
            </p>
          )}
          {shopConfig.contact.phone && (
            <a href={"tel:" + shopConfig.contact.phone}>
              <PhoneOutlined aria-hidden="true" /> {shopConfig.contact.phone}
            </a>
          )}
          {shopConfig.contact.email && (
            <a href={"mailto:" + shopConfig.contact.email}>
              <MailOutlined aria-hidden="true" /> {shopConfig.contact.email}
            </a>
          )}
        </div>
        <div className="footer-location">
          <h4>{t("Vị trí cửa hàng")}</h4>
          <ShopMap contact={shopConfig.contact} />
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
        size={chatWidth}
        resizable={{ onResize: resizeChat }}
        styles={{ wrapper: { maxWidth: "100vw" } }}
        extra={
          <Tooltip title={chatSizeLabel}>
            <Button
              className="chat-resize-toggle"
              type="text"
              icon={chatWidth > 400 ? <ShrinkOutlined /> : <ExpandOutlined />}
              aria-label={chatSizeLabel}
              onClick={() => resizeChat(chatWidth > 400 ? 378 : 640)}
            />
          </Tooltip>
        }
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
            <Button
              type="primary"
              disabled={!draft.trim() || !s.chatConnected}
              onClick={send}
            >
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
