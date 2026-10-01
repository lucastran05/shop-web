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
  const [cart, setCart] = useSaved("cart", []),
    [user, setUser] = useSaved("user", null),
    [orders, setOrders] = useSaved("orders", []),
    [messages, setMessages] = useSaved("chat", []),
    [notifications, setNotifications] = useSaved("notifications", []),
    [profiles, setProfiles] = useSaved("profiles", {}),
    [reviews, setReviews] = useSaved("reviews", []);
  function add(p, variantId, quantity) {
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
