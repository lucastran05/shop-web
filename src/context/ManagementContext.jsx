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
  const [demoMessages, setDemoMessages] = useSaved("management-messages", [
    {
      id: "hello",
      owner: "khach1@example.com",
      text: "Shop ơi, cho mình hỏi đơn hàng bao giờ được giao ạ?",
      at: new Date().toISOString(),
    },
  ]);
  const orders = [...shop.orders, ...demoOrders];
  const messages = [...demoMessages, ...shop.messages];
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
    const setter = shop.messages.some((m) => m.owner === owner)
      ? shop.setMessages
      : setDemoMessages;
    setter((old) => [
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
        session,
        setSession,
        products,
        setProducts,
        categories,
        setCategories,
        orders,
        updateOrder,
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
