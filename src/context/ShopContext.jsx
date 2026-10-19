import { useEffect, useRef, useState } from "react";
import { Context } from "./shop";
import { Button, Result, Spin } from "antd";
import { userError } from "../utils/userError";
import {
  listAll,
  mapMessage,
  mapOrder,
  mapShop,
} from "../services/viewAdapters";
import { shopConfig } from "../constants/shop";
import { api } from "../services/api";
import { mapProductSummary } from "../services/productAdapter";
export function ShopProvider({ children }) {
  const [shopInfo, setShopInfo] = useState({
    name: shopConfig.name,
    description: shopConfig.description,
    contact: shopConfig.contact,
  });
  useEffect(() => {
    document.title = shopInfo.name || shopConfig.name;
  }, [shopInfo.name]);
  const [user, setUser] = useState(null);
  const chatUser = useRef(null);
  useEffect(() => {
    chatUser.current = user?.id;
    return () => {
      chatUser.current = null;
    };
  }, [user?.id]);
  const [orders, setOrders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [sessionError, setSessionError] = useState(null);
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const [conversationId, setConversationId] = useState(null);
  useEffect(() => api.http.onSessionCleared(() => setUser(null)), []);
  useEffect(() => {
    let active = true;
    setAuthLoading(true);
    setSessionError(null);
    if (!api.http.hasSession()) {
      setUser(null);
      setAuthLoading(false);
      return;
    }
    api.auth
      .getProfile()
      .then(({ data }) => {
        if (active) setUser(data);
      })
      .catch((error) => {
        if (!active) return;
        if ([401, 403].includes(error.status) || !api.http.hasSession()) {
          api.http.clearTokens();
          setUser(null);
        } else setSessionError(error);
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sessionAttempt]);
  useEffect(() => {
    let active = true;
    api.shop
      .get()
      .then(({ data }) => {
        if (active) setShopInfo(mapShop(data));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(null);
  useEffect(() => {
    let active = true;
    Promise.all([
      listAll((query) => api.products.list(query)),
      api.products.categories(),
    ])
      .then(([productResponse, categoryResponse]) => {
        if (!active) return;
        setProducts(productResponse.map(mapProductSummary));
        setCategories(categoryResponse.data);
        setCatalogError(null);
      })
      .catch((error) => {
        if (!active) return;
        setCatalogError(error);
        console.error("Unable to load the public product catalog", error);
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function refreshOrders() {
    const rows = await listAll((query) => api.orders.list(query));
    const detailed = await Promise.all(
      rows.map((row) => api.orders.get(row.id)),
    );
    const next = detailed.map(({ data }) => mapOrder(data, user?.email));
    setOrders(next);
    return next;
  }
  async function refreshNotifications() {
    const rows = await listAll((query) =>
      api.chatAndNotifications.notifications(query),
    );
    setNotifications(
      rows.map((item) => ({
        ...item,
        owner: user?.email,
        text: item.content,
        read: item.is_read,
        createdAt: item.created_at,
      })),
    );
  }
  useEffect(() => {
    let active = true;
    setOrders([]);
    setNotifications([]);
    setMessages([]);
    setConversationId(null);
    if (!user?.id) return;
    listAll((query) => api.orders.list(query))
      .then((rows) => Promise.all(rows.map((row) => api.orders.get(row.id))))
      .then((rows) => {
        if (active)
          setOrders(rows.map(({ data }) => mapOrder(data, user.email)));
      })
      .catch(() => {});
    listAll((query) => api.chatAndNotifications.notifications(query))
      .then((rows) => {
        if (active)
          setNotifications(
            rows.map((item) => ({
              ...item,
              owner: user.email,
              text: item.content,
              read: item.is_read,
              createdAt: item.created_at,
            })),
          );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user?.id, user?.email]);
  async function openChat() {
    if (!user) return;
    const userId = user.id;
    const { data } = await api.chatAndNotifications.openConversation();
    if (chatUser.current !== userId) return;
    setConversationId(data.id);
    const { data: rows } = await api.chatAndNotifications.messages(data.id, {
      limit: 100,
    });
    if (chatUser.current === userId)
      setMessages(rows.map((item) => mapMessage(item, user.email)));
    return data.id;
  }
  async function sendMessage(content) {
    if (!user) return;
    const userId = user.id;
    const id = conversationId || (await openChat());
    if (!id || chatUser.current !== userId) return;
    const { data } = await api.chatAndNotifications.sendMessage(id, {
      content,
      client_message_id: crypto.randomUUID(),
    });
    if (chatUser.current === userId)
      setMessages((old) =>
        old.some((item) => item.id === data.id)
          ? old
          : [...old, mapMessage(data, user.email)],
      );
  }
  async function refreshMessages() {
    if (!conversationId || !user) return;
    const { data: rows } = await api.chatAndNotifications.messages(
      conversationId,
      { limit: 100 },
    );
    if (chatUser.current !== user.id) return;
    setMessages((old) => {
      const byId = new Map(old.map((item) => [item.id, item]));
      for (const item of rows) byId.set(item.id, mapMessage(item, user.email));
      return [...byId.values()].sort(
        (a, b) =>
          a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
      );
    });
  }
  async function readNotification(id) {
    await api.chatAndNotifications.readNotification(id);
    setNotifications((old) =>
      old.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
  }
  async function readAllNotifications() {
    await api.chatAndNotifications.readAllNotifications();
    setNotifications((old) => old.map((item) => ({ ...item, read: true })));
  }
  function updateProfile(values) {
    return api.auth
      .updateProfile({
        ...(values.name === undefined ? {} : { name: values.name }),
        ...(values.phone === undefined ? {} : { phone: values.phone }),
      })
      .then(({ data }) => {
        setUser((current) => ({ ...current, ...data }));
        return data;
      });
  }
  function logout() {
    return api.auth.logout().finally(() => setUser(null));
  }
  function setItemsFromServer(cartResponse) {
    return cartResponse.data.items.map((item) => ({
      key: item.id,
      id: item.product_id,
      variantId: item.variant_id,
      name: item.product_name,
      variantLabel: item.variant_label,
      color: item.color,
      image: item.image_url,
      price: item.unit_price,
      quantity: item.quantity,
      stock: item.stock_quantity,
      selected: true,
    }));
  }
  function refreshCart() {
    return api.cart.get().then((response) => {
      setItems(setItemsFromServer(response));
      return response.data;
    });
  }
  const [items, setItems] = useState([]);
  const userId = user?.id;
  useEffect(() => {
    if (!userId) {
      setItems([]);
      return;
    }
    let active = true;
    api.cart
      .get()
      .then((response) => {
        if (active) setItems(setItemsFromServer(response));
      })
      .catch((error) => {
        console.error("Unable to load the authenticated cart", error);
      });
    return () => {
      active = false;
    };
  }, [userId]);
  function add(product, variantId, quantity) {
    if (!user || !Number.isInteger(quantity) || quantity < 1) return null;
    const variant = product.variants.find((item) => item.id === variantId);
    if (!variant || variant.stock_quantity < 1) return null;
    return api.cart
      .add({
        product_id: product.id,
        variant_id: variantId,
        quantity,
      })
      .then((response) => {
        setItems(setItemsFromServer(response));
        return response.data.items.at(-1)?.id ?? null;
      });
  }
  function updateCartItem(id, patch) {
    const current = items.find((item) => item.key === id);
    if (!current) return Promise.resolve();
    if (patch.selected !== undefined && patch.quantity === undefined) {
      setItems((old) =>
        old.map((item) =>
          item.key === id ? { ...item, selected: patch.selected } : item,
        ),
      );
      return Promise.resolve();
    }
    return api.cart
      .update(id, { quantity: patch.quantity })
      .then((response) => {
        const selected = new Map(
          items.map((item) => [item.key, item.selected]),
        );
        setItems(
          setItemsFromServer(response).map((item) => ({
            ...item,
            selected: selected.get(item.key) ?? true,
          })),
        );
      });
  }
  function removeCartItem(id) {
    return api.cart.remove(id).then((response) => {
      const selected = new Map(items.map((item) => [item.key, item.selected]));
      setItems(
        setItemsFromServer(response).map((item) => ({
          ...item,
          selected: selected.get(item.key) ?? true,
        })),
      );
    });
  }
  function setCart(update) {
    const next = typeof update === "function" ? update(items) : update;
    const removed = items.filter(
      (item) => !next.some((x) => x.key === item.key),
    );
    const changed = next.filter((item) => {
      const previous = items.find((x) => x.key === item.key);
      return previous && previous.quantity !== item.quantity;
    });
    const selectionsChanged = next.some((item) => {
      const previous = items.find((x) => x.key === item.key);
      return previous && previous.selected !== item.selected;
    });
    if (selectionsChanged) {
      setItems((old) =>
        old.map((item) => ({
          ...item,
          selected: next.find((x) => x.key === item.key)?.selected ?? true,
        })),
      );
    }
    return Promise.all([
      ...removed.map((item) => removeCartItem(item.key)),
      ...changed.map((item) => updateCartItem(item.key, item)),
    ]);
  }
  if (authLoading) return <Spin fullscreen />;
  if (sessionError)
    return (
      <Result
        status="warning"
        title={userError(sessionError)}
        extra={
          <Button onClick={() => setSessionAttempt((value) => value + 1)}>
            Thử lại
          </Button>
        }
      />
    );
  return (
    <Context.Provider
      value={{
        shopInfo,
        setShopInfo,
        products,
        categories,
        catalogLoading,
        catalogError,
        cart: items,
        items,
        setCart,
        refreshCart,
        add,
        updateCartItem,
        removeCartItem,
        user,
        setUser,
        logout,
        orders,
        setOrders,
        messages,
        setMessages,
        notifications,
        setNotifications,
        refreshOrders,
        refreshNotifications,
        openChat,
        sendMessage,
        refreshMessages,
        readNotification,
        readAllNotifications,
        updateProfile,
      }}
    >
      {children}
    </Context.Provider>
  );
}
