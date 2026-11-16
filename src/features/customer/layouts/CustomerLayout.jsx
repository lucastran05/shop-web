import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  ConfigProvider,
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
import ChatLauncher from "../components/ChatLauncher";
import { userError } from "../../../shared/utils/userError";
import { botanicalTheme } from "../styles/theme";
import "../styles/botanical.css";
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
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    // Ngưỡng bật/tắt khác nhau để không nhấp nháy quanh mốc
    const onScroll = () =>
      setScrolled((was) => (was ? window.scrollY > 4 : window.scrollY > 24));
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
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
  const unreadNotices = notices.filter((n) => !n.read).length;
  const notificationContent = (
    <div className="bt-notices">
      <header>
        <h3>{t("Thông báo của bạn")}</h3>
        {unreadNotices > 0 && (
          <button type="button" onClick={() => perform(s.readAllNotifications)}>
            {t("Đánh dấu tất cả đã đọc")}
          </button>
        )}
      </header>
      {notices.length ? (
        <ul>
          {notices.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                className={n.read ? undefined : "is-unread"}
                onClick={() => {
                  perform(() => s.readNotification(n.id));
                  setNotice(false);
                  navigate("/orders");
                }}
              >
                <span className="bt-notice-text">
                  {n.key ? t(n.key, n.params) : n.text}
                </span>
                {n.createdAt && (
                  <time dateTime={n.createdAt}>
                    {formatDateTime(n.createdAt, timeZone)}
                  </time>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="bt-notices-empty">
          {t("Chưa có thông báo")}
          <small>{t("Cập nhật về đơn hàng của bạn sẽ hiện ở đây.")}</small>
        </p>
      )}
    </div>
  );
  const cartCount = s.items.reduce((n, i) => n + i.quantity, 0);
  return (
    <ConfigProvider theme={botanicalTheme}>
      <div className="bt">
        <a className="bt-skip" href="#bt-main">
          {t("Bỏ qua tới nội dung")}
        </a>
        <header className={"bt-header" + (scrolled ? " is-scrolled" : "")}>
          <Link to="/" className="bt-logo">
            <img src="/logo/logo.svg" alt="" width="40" height="36" />
            <span>{shopConfig.name}</span>
          </Link>
          <nav className="bt-nav" aria-label={t("Điều hướng chính")}>
            <Link
              className={location.pathname === "/" ? "is-active" : undefined}
              aria-current={location.pathname === "/" ? "page" : undefined}
              to="/"
            >
              {t("Cửa hàng")}
            </Link>
            <Link
              className={
                location.pathname === "/shop-info" ? "is-active" : undefined
              }
              aria-current={
                location.pathname === "/shop-info" ? "page" : undefined
              }
              to="/shop-info"
            >
              {t("Thông tin")}
            </Link>
          </nav>
          <HeaderSearch key={location.pathname + location.search} />
          <div className="bt-actions">
            {s.user ? (
              <>
                <Popover
                  rootClassName="bt-notice-pop"
                  arrow={false}
                  trigger="click"
                  placement="bottomRight"
                  open={notice}
                  onOpenChange={setNotice}
                  content={notificationContent}
                >
                  <Button
                    aria-label={t("Thông báo")}
                    type="text"
                    shape="circle"
                  >
                    <Badge count={unreadNotices} size="small">
                      <BellOutlined />
                    </Badge>
                  </Button>
                </Popover>
                <Dropdown menu={menu} trigger={["click"]}>
                  <Button type="text" className="bt-user">
                    <span className="bt-avatar" aria-hidden="true">
                      {s.user.name.split(" ").at(-1)?.[0]}
                    </span>
                    {s.user.name.split(" ").at(-1)}
                  </Button>
                </Dropdown>
                <Link to="/cart" className="bt-cart" aria-label={t("Giỏ hàng")}>
                  <ShoppingOutlined aria-hidden="true" />
                  <span>{t("Giỏ")}</span>
                  <b key={cartCount}>{cartCount}</b>
                </Link>
              </>
            ) : (
              <Button
                type="primary"
                icon={<UserOutlined />}
                onClick={() => navigate("/login")}
              >
                {t("Đăng nhập")}
              </Button>
            )}
          </div>
        </header>
        <main id="bt-main">
          <Outlet />
        </main>
        <footer className="bt-footer">
          <div className="bt-footer-mark">
            <Link to="/" className="bt-footer-name">
              {shopConfig.name}
            </Link>
            <p>{t(shopConfig.description)}</p>
            <div className="bt-footer-socials">
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
          <div className="bt-footer-col">
            <h4>{t("Thông tin khách hàng")}</h4>
            <Link to="/">{t("Sản phẩm")}</Link>
            <Link to="/orders">{t("Theo dõi đơn hàng")}</Link>
            <Link to="/account">{t("Tài khoản")}</Link>
            <Link to="/settings">{t("Cài đặt")}</Link>
          </div>
          <div className="bt-footer-col">
            <h4>{t("Liên hệ")}</h4>
            <Link to="/shop-info">{t("Thông tin")}</Link>
            {shopConfig.contact.address && (
              <p>
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
          <div className="bt-footer-map">
            <h4>{t("Vị trí cửa hàng")}</h4>
            <ShopMap contact={shopConfig.contact} />
          </div>
          <div className="bt-footer-legal">
            © {new Date().getFullYear()} {shopConfig.name}
          </div>
        </footer>
      <ChatLauncher
        key={s.user?.id || s.user?.email || "guest"}
        unread={unreadChat}
        onShopChat={() => {
          if (!s.user) {
            navigate("/login");
            return;
          }
          setChat(true);
          perform(s.openChat);
        }}
      />
        <Drawer
          title={t("Trò chuyện với shop")}
          rootClassName="bt-chat"
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
            <Input.TextArea
              autoSize={{ minRows: 2, maxRows: 2 }}
              style={{
                resize: "none",
                overflowY: "auto",
                overflowWrap: "anywhere",
              }}
              aria-label={t("Nội dung tin nhắn")}
              maxLength={1000}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onPressEnter={(e) => {
                if (!e.nativeEvent.isComposing && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
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
      </div>
    </ConfigProvider>
  );
}
