import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { App } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import PageLoading from "../components/PageLoading";

export const ShopContext = createContext(null);
export const Context = ShopContext;
import RequestError from "../components/RequestError";
import {
  listAll,
  mapMessage,
  mapOrder,
  mapShop,
} from "../adapters/viewAdapters";
import { shopConfig } from "../constants/shop";
import { api } from "../api";
import { createSessionStore, SESSION_STORAGE_KEY } from "../api/session-store";
import { mapProductSummary } from "../adapters/productAdapter";
import { usePolling } from "../hooks/usePolling";
import { useChatSocket } from "../hooks/useChatSocket";
import { mergeMessages } from "../utils/mergeMessages";
export function ShopProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isManagement = location.pathname.startsWith("/management");
  const { message } = App.useApp();
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
  const removedMessages = useRef(new Set());
  const chatRead = useRef(false);
  useEffect(() => {
    chatUser.current = user?.id;
    removedMessages.current.clear();
    chatRead.current = false;
    return () => {
      chatUser.current = null;
      chatRead.current = false;
    };
  }, [user?.id]);
  const [orders, setOrders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [sessionError, setSessionError] = useState(null);
  const [sessionAttempt, setSessionAttempt] = useState(0);
  useEffect(() => {
    return api.http.onSessionCleared((reason) => {
      setUser(null);
      if (reason !== "expired") return;
      message.warning("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const target = `${location.pathname}${location.search}${location.hash}`;
      const loginPath = location.pathname.startsWith("/management")
        ? "/management/login"
        : "/login";
      navigate(`${loginPath}?expired=1&next=${encodeURIComponent(target)}`, {
        replace: true,
      });
    });
  }, [location, message, navigate]);
  useEffect(() => {
    let storage;
    try {
      storage = createSessionStore(window.localStorage);
    } catch {
      return;
    }
    async function syncSession(event) {
      if (event.key && event.key !== SESSION_STORAGE_KEY) return;
      const tokens = storage.read();
      if (!tokens) {
        api.http.clearTokens();
        setUser(null);
        return;
      }
      api.http.setTokens(tokens);
      setSessionError(null);
      try {
        const { data } = await api.auth.getProfile();
        if (api.http.getAccessToken() !== tokens.accessToken) return;
        setUser(data);
      } catch (error) {
        if (api.http.getAccessToken() !== tokens.accessToken) return;
        if ([401, 403].includes(error.status)) {
          api.http.clearTokens("expired");
          setUser(null);
        } else setSessionError(error);
      }
    }
    window.addEventListener("storage", syncSession);
    return () => window.removeEventListener("storage", syncSession);
  }, []);
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
          api.http.clearTokens("expired");
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
  const refreshOrders = useCallback(async () => {
    const rows = await listAll((query) => api.orders.list(query));
    const next = rows.map((row) => mapOrder(row, user?.email));
    setOrders(next);
    return next;
  }, [user?.email]);
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
    chatRead.current = false;
    if (!user?.id || isManagement) return;
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
  }, [user?.id, user?.email, isManagement]);
  async function openChat() {
    if (!user) return;
    chatRead.current = true;
    await refreshMessages();
    return user.id;
  }
  async function sendMessage(content) {
    if (!user) return;
    const userId = user.id;
    const { message: data } = await chatRequest("send", { content });
    if (chatUser.current === userId)
      setMessages((old) =>
        mergeMessages(
          old,
          [mapMessage(data, user.email)],
          removedMessages.current,
        ),
      );
  }
  async function refreshMessages() {
    if (!user) return;
    const { data: rows } = await api.chatAndNotifications.messages(user.id, {
      limit: 100,
    });
    if (chatUser.current !== user.id) return;
    if (
      chatRead.current &&
      !document.hidden &&
      rows.some(
        (item) => item.sender_role !== "customer" && item.is_read !== true,
      )
    ) {
      await markChatRead();
    }
    setMessages((old) => {
      return mergeMessages(
        old,
        rows.map((item) => {
          const mapped = mapMessage(item, user.email);
          return mapped.from === "shop" && chatRead.current && !document.hidden
            ? { ...mapped, is_read: true }
            : mapped;
        }),
        removedMessages.current,
      );
    });
  }
  const {
    request: chatRequest,
    connected: chatConnected,
    error: chatError,
  } = useChatSocket({
    userId: user?.id,
    enabled: !isManagement,
    onReady: refreshMessages,
    onMessage: ({ message: incoming, customer, ids }) => {
      if (customer?.id !== user?.id) return;
      if (ids) {
        ids.forEach((id) => removedMessages.current.add(id));
        setMessages((old) => mergeMessages(old, [], removedMessages.current));
        return;
      }
      const mapped = mapMessage(incoming, user.email);
      setMessages((old) =>
        mergeMessages(old, [mapped], removedMessages.current),
      );
      if (mapped.from === "shop" && chatRead.current && !document.hidden) {
        markChatRead().catch(() => {});
      }
    },
  });
  const markChatRead = useCallback(async () => {
    const id = user?.id;
    if (!id) return;
    await chatRequest("read");
    if (chatUser.current === id)
      setMessages((old) =>
        old.map((item) =>
          item.from === "shop" ? { ...item, is_read: true } : item,
        ),
      );
  }, [user?.id, chatRequest]);
  useEffect(() => {
    const readVisibleChat = () => {
      if (
        chatRead.current &&
        !document.hidden &&
        messages.some((item) => item.from === "shop" && !item.is_read)
      )
        markChatRead().catch(() => {});
    };
    window.addEventListener("focus", readVisibleChat);
    document.addEventListener("visibilitychange", readVisibleChat);
    return () => {
      window.removeEventListener("focus", readVisibleChat);
      document.removeEventListener("visibilitychange", readVisibleChat);
    };
  }, [markChatRead, messages]);
  function closeChat() {
    chatRead.current = false;
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
      deposit: item.allow_deposit,
      deposit_rate: item.deposit_rate,
      price: item.unit_price,
      quantity: item.quantity,
      stock: item.stock_quantity,
      selected: true,
    }));
  }
  function refreshCart() {
    return api.cart.get().then((response) => {
      const selected = new Map(items.map((item) => [item.key, item.selected]));
      setItems(
        setItemsFromServer(response).map((item) => ({
          ...item,
          selected: selected.get(item.key) ?? true,
        })),
      );
      return response.data;
    });
  }
  const [items, setItems] = useState([]);
  const userId = user?.id;
  async function refreshCatalogProducts() {
    const rows = await listAll((query) => api.products.list(query));
    setProducts(rows.map(mapProductSummary));
  }
  usePolling(
    async () => {
      await Promise.allSettled([
        ...(location.pathname === "/" ? [refreshCatalogProducts()] : []),
        ...(user?.id
          ? [
              ...(location.pathname === "/orders" ? [refreshOrders()] : []),
              refreshNotifications(),
              refreshCart(),
            ]
          : []),
      ]);
    },
    {
      enabled: !isManagement,
      intervalMs: 0,
      immediate: false,
      onError: () => {},
    },
  );
  useEffect(() => {
    if (!userId || isManagement) {
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
  }, [userId, isManagement]);
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
  if (authLoading) return <PageLoading />;
  if (sessionError)
    return (
      <RequestError
        error={sessionError}
        onRetry={() => setSessionAttempt((value) => value + 1)}
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
        closeChat,
        sendMessage,
        refreshMessages,
        chatConnected,
        chatError,
        readNotification,
        readAllNotifications,
        updateProfile,
      }}
    >
      {children}
    </Context.Provider>
  );
}
