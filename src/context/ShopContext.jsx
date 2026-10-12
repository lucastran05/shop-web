import { expireOrders } from "../utils/orderLifecycle";
import { products } from "../services/productService";
import { useEffect } from "react";
import { Context } from "./shop";
import { useSaved } from "../hooks/useSaved";
import { shopConfig } from "../constants/shop";
export function ShopProvider({ children }) {
  const [shopInfo, setShopInfo] = useSaved("shop-info", {
    name: shopConfig.name,
    description: shopConfig.description,
    contact: shopConfig.contact,
  });
  useEffect(() => {
    document.title = shopInfo.name || shopConfig.name;
  }, [shopInfo.name]);
  const [storedCart, saveCart] = useSaved("cart", []),
    [user, setUser] = useSaved("user", null),
    [orders, setOrders] = useSaved("orders", []),
    [messages, setMessages] = useSaved("chat", []),
    [notifications, setNotifications] = useSaved("notifications", []),
    [profiles, setProfiles] = useSaved("profiles", {}),
    [reviews, setReviews] = useSaved("reviews", []);
  const cart = user
    ? storedCart.filter((item) => item.owner === user.email || !item.owner)
    : [];
  function setCart(update) {
    if (!user) return;
    saveCart((old) => {
      const owned = old.filter(
        (item) => !item.owner || item.owner === user.email,
      );
      const next = typeof update === "function" ? update(owned) : update;
      return [
        ...old.filter((item) => item.owner && item.owner !== user.email),
        ...next.map((item) => ({ ...item, owner: user.email })),
      ];
    });
  }
  useEffect(() => {
    if (user)
      saveCart((old) =>
        old.map((item) => (item.owner ? item : { ...item, owner: user.email })),
      );
  }, [user?.email, saveCart]);
  useEffect(() => {
    const expire = () => setOrders((old) => expireOrders(old));
    expire();
    const timer = setInterval(expire, 1000);
    window.addEventListener("focus", expire);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", expire);
    };
  }, [setOrders]);
  function add(p, variantId, quantity) {
    if (!user || !Number.isInteger(quantity) || quantity < 1) return null;
    const v = p.variants.find((v) => v.id === variantId);
    if (!v || !v.stock) return null;
    const key = `${p.id}-${v.id}`;
    setCart((old) => {
      const existing = old.find((x) => x.key === key);
      return existing
        ? old.map((x) =>
            x.key === key
              ? { ...x, quantity: Math.min(v.stock, x.quantity + quantity) }
              : x,
          )
        : [
            ...old,
            {
              key,
              id: p.id,
              variantId: v.id,
              quantity: Math.min(quantity, v.stock),
              selected: true,
            },
          ];
    });
    return key;
  }
  function notify(key, params = {}) {
    setNotifications((old) => [
      {
        id: crypto.randomUUID(),
        key,
        params,
        createdAt: new Date().toISOString(),
        read: false,
        owner: user.email,
      },
      ...old,
    ]);
  }
  function updateProfile(values) {
    const next = { ...user, ...values };
    setUser(next);
    setProfiles((old) => ({ ...old, [next.email]: next }));
  }
  const items = cart.flatMap((x) => {
    const p = products.find((p) => p.id === x.id),
      v = p?.variants.find((v) => v.id === x.variantId);
    return p && v
      ? [{ ...p, ...v, ...x, variantLabel: v.label, color: v.color }]
      : [];
  });
  return (
    <Context.Provider
      value={{
        shopInfo,
        setShopInfo,
        cart,
        items,
        setCart,
        add,
        user,
        setUser,
        orders,
        setOrders,
        messages,
        setMessages,
        notifications,
        setNotifications,
        notify,
        profiles,
        updateProfile,
        reviews,
        setReviews,
      }}
    >
      {children}
    </Context.Provider>
  );
}
