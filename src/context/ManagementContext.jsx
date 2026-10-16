import { ManagementContext } from "./management";
import { useSaved } from "../hooks/useSaved";
import { useShop } from "../hooks/useShop";
import {
  initialProducts,
  initialUsers,
  seedOrders,
} from "../constants/management";

export function ManagementProvider({ children }) {
  const shop = useShop();
  const [lowStockLimit, setLowStockLimit] = useSaved(
    "management-low-stock-limit",
    5,
  );
  const [account, setSession] = useSaved("management-session", null);
  const [products, setProducts] = useSaved(
    "management-products",
    initialProducts,
  );
  const [categories, setCategories] = useSaved("management-categories", [
    "Danh mục 1",
    "Danh mục 2",
    "Danh mục 3",
  ]);
  const [demoOrders, setDemoOrders] = useSaved(
    "management-orders",
    seedOrders(),
  );
  const [users, setUsers] = useSaved("management-users", initialUsers);
  const [readMessages, setReadMessages] = useSaved(
    "management-read-messages",
    {},
  );
  const [chatPreferences, setChatPreferences] = useSaved(
    "management-chat-preferences",
    {},
  );
  const chatPreference = chatPreferences[account?.id] || {};
  function updateChatPreference(owner, patch) {
    if (!account?.id) return;
    setChatPreferences((old) => ({
      ...old,
      [account.id]: {
        ...old[account.id],
        [owner]: { ...old[account.id]?.[owner], ...patch },
      },
    }));
  }
  function markUnread(owner) {
    const ids = messages.filter((m) => m.owner === owner).map((m) => m.id);
    if (!account?.id) return;
    setReadMessages((old) => ({
      ...old,
      [account.id]: (old[account.id] || []).filter((id) => !ids.includes(id)),
    }));
    updateChatPreference(owner, { unread: true });
  }
  const [hiddenInventory, setHiddenInventory] = useSaved(
    "management-hidden-inventory",
    [],
  );
  const [hiddenPayments, setHiddenPayments] = useSaved(
    "management-hidden-payments",
    [],
  );
  const session =
    users.find(
      (user) =>
        user.id === account?.id &&
        user.active &&
        ["admin", "manager"].includes(user.role),
    ) || null;
  const [stockHistory, setStockHistory] = useSaved(
    "management-stock-history",
    [],
  );
  const [demoMessages] = useSaved("management-messages", [
    {
      id: "hello",
      owner: "khach1@example.com",
      text: "Shop ơi, cho mình hỏi đơn hàng bao giờ được giao ạ?",
      at: new Date().toISOString(),
    },
  ]);
  const orders = [...shop.orders, ...demoOrders];
  const messages = [...demoMessages, ...shop.messages];
  function deleteOrders(ids) {
    shop.setOrders((old) => old.filter((order) => !ids.includes(order.id)));
    setDemoOrders((old) => old.filter((order) => !ids.includes(order.id)));
  }
  function markRead(owner) {
    if (!account?.id) return;
    updateChatPreference(owner, { unread: false });
    const ids = messages
      .filter((m) => m.owner === owner && m.from !== "shop")
      .map((m) => m.id);
    setReadMessages((old) => ({
      ...old,
      [account.id]: [...new Set([...(old[account.id] || []), ...ids])],
    }));
  }
  function updateOrder(order) {
    const setter = shop.orders.some((o) => o.id === order.id)
      ? shop.setOrders
      : setDemoOrders;
    setter((old) => old.map((o) => (o.id === order.id ? order : o)));
    if (shop.orders.some((o) => o.id === order.id))
      shop.setNotifications((old) => [
        {
          id: crypto.randomUUID(),
          owner: order.owner,
          text: `Đơn ${order.id}: ${order.status}`,
          read: false,
        },
        ...old,
      ]);
  }
  function reply(owner, text) {
    if (!text.trim()) return;
    updateChatPreference(owner, { hidden: false });
    shop.setMessages((old) => [
      ...old,
      {
        id: crypto.randomUUID(),
        owner,
        text,
        from: "shop",
        at: new Date().toISOString(),
      },
    ]);
  }
  return (
    <ManagementContext.Provider
      value={{
        lowStockLimit,
        setLowStockLimit,
        session,
        setSession,
        products,
        setProducts,
        categories,
        setCategories,
        orders,
        updateOrder,
        deleteOrders,
        hiddenInventory,
        setHiddenInventory,
        hiddenPayments,
        setHiddenPayments,
        readMessageIds: readMessages[account?.id] || [],
        markRead,
        markUnread,
        chatPreference,
        updateChatPreference,
        customers: [
          ...Object.values(shop.profiles),
          ...users.filter((u) => u.role === "customer"),
          ...orders.map((o) => ({ email: o.owner, name: o.recipient?.name })),
        ],
        users,
        setUsers,
        stockHistory,
        setStockHistory,
        messages,
        reply,
      }}
    >
      {children}
    </ManagementContext.Provider>
  );
}
