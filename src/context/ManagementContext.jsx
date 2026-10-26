import { useCallback, useEffect, useRef, useState } from "react";
import { ManagementContext } from "./management";
import { useSaved } from "../hooks/useSaved";
import { useShop } from "../hooks/useShop";
import { api } from "../services/api";
import { mapProductDetail } from "../services/productAdapter";
import {
  listAll,
  mapMessage,
  mapOrder,
  orderLabels,
} from "../services/viewAdapters";
import { userError } from "../utils/userError";

const managementOrderLabels = { ...orderLabels, processing: "Đã đóng gói" };

export function ManagementProvider({ children }) {
  const shop = useShop();
  const session =
    shop.user?.is_active !== false &&
    ["admin", "manager"].includes(shop.user?.role)
      ? shop.user
      : null;
  const sessionRef = useRef(session?.id);
  useEffect(() => {
    sessionRef.current = session?.id;
    return () => {
      sessionRef.current = undefined;
    };
  }, [session?.id]);
  const [products, saveProducts] = useState([]);
  const [categoryRows, saveCategories] = useState([]);
  const [orders, saveOrders] = useState([]);
  const [users, saveUsers] = useState([]);
  const [messages, saveMessages] = useState([]);
  const [stockHistory, saveStockHistory] = useState([]);
  const [vouchers, saveVouchers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lowStockLimit, setLowStockLimit] = useState(5);
  const [readMessages, setReadMessages] = useSaved(
    "management-read-messages",
    {},
  );
  const [chatPreferences, setChatPreferences] = useSaved(
    "management-chat-preferences",
    {},
  );
  const [hiddenInventory, setHiddenInventory] = useSaved(
    "management-hidden-inventory",
    [],
  );
  const [hiddenPayments, setHiddenPayments] = useSaved(
    "management-hidden-payments",
    [],
  );
  const chatPreference = chatPreferences[session?.id] || {};

  const loadProducts = useCallback(async () => {
    const sessionId = sessionRef.current;
    const rows = await listAll((query) => api.adminProducts.list(query));
    const details = await Promise.all(
      rows.map((row) => api.adminProducts.get(row.id)),
    );
    const next = details.map(({ data }) => ({
      ...mapProductDetail(data),
      active: data.is_active,
      depositRate: data.deposit_rate,
    }));
    if (sessionRef.current === sessionId) saveProducts(next);
    return next;
  }, []);
  const loadCategories = useCallback(async () => {
    const sessionId = sessionRef.current;
    const { data } = await api.adminCategories.list();
    if (sessionRef.current === sessionId) saveCategories(data);
  }, []);
  const loadOrders = useCallback(async () => {
    const sessionId = sessionRef.current;
    const rows = await listAll((query) => api.adminOrders.list(query));
    const details = await Promise.all(
      rows.map((row) => api.adminOrders.get(row.id)),
    );
    if (sessionRef.current === sessionId)
      saveOrders(
        details.map(({ data }) => ({
          ...mapOrder(data),
          status:
            data.status === "processing" ? "Đã đóng gói" : mapOrder(data).status,
          note: data.note || "",
          paymentNote: data.payment_note || data.note || "",
        })),
      );
  }, []);
  const loadUsers = useCallback(async () => {
    const sessionId = sessionRef.current;
    const rows = await listAll((query) => api.adminUsers.list(query));
    if (sessionRef.current === sessionId)
      saveUsers(rows.map((row) => ({ ...row, active: row.is_active })));
  }, []);
  const loadMessages = useCallback(async () => {
    const sessionId = sessionRef.current;
    const rows = await listAll((query) => api.adminChat.list(query));
    const threads = await Promise.all(
      rows.map(async (row) => {
        const { data } = await api.adminChat.messages(row.id, { limit: 100 });
        return data.map((item) => ({
          ...mapMessage(item, row.customer.email),
          conversationId: row.id,
        }));
      }),
    );
    if (sessionRef.current === sessionId) saveMessages(threads.flat());
  }, []);
  const loadStockHistory = useCallback(async () => {
    const sessionId = sessionRef.current;
    const rows = await listAll((query) =>
      api.adminInventory.adjustments(query),
    );
    if (sessionRef.current === sessionId)
      saveStockHistory(
        rows.map((row) => ({
          ...row,
          product: row.product_name,
          variant: row.variant_label,
          at: row.created_at,
        })),
      );
  }, []);
  const loadVouchers = useCallback(async () => {
    const sessionId = sessionRef.current;
    const { data } = await api.adminVouchers.list();
    if (sessionRef.current === sessionId) saveVouchers(data);
  }, []);

  const refresh = useCallback(async () => {
    const tasks = [
      loadProducts(),
      loadCategories(),
      loadOrders(),
      loadMessages(),
      loadStockHistory(),
      loadVouchers(),
    ];
    if (session?.role === "admin") tasks.push(loadUsers());
    const results = await Promise.allSettled(tasks);
    const failure = results.find((result) => result.status === "rejected");
    setError(failure ? userError(failure.reason) : null);
    return !failure;
  }, [
    loadProducts,
    loadCategories,
    loadOrders,
    loadMessages,
    loadStockHistory,
    loadVouchers,
    loadUsers,
    session?.role,
  ]);

  useEffect(() => {
    let active = true;
    saveProducts([]);
    saveCategories([]);
    saveOrders([]);
    saveUsers([]);
    saveMessages([]);
    saveStockHistory([]);
    saveVouchers([]);
    if (!session?.id) return;
    setLoading(true);
    refresh().finally(() => {
      if (active) setLoading(false);
    });
    const syncManagementData = () => {
      if (document.visibilityState === "hidden") return;
      Promise.allSettled([loadProducts(), loadOrders(), loadMessages(), loadVouchers()]);
    };
    const interval = window.setInterval(syncManagementData, 1000);
    window.addEventListener("focus", syncManagementData);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", syncManagementData);
    };
  }, [session?.id, refresh, loadProducts, loadOrders, loadMessages, loadVouchers]);

  function updateChatPreference(owner, patch) {
    if (!session) return;
    setChatPreferences((old) => ({
      ...old,
      [session.id]: {
        ...old[session.id],
        [owner]: { ...old[session.id]?.[owner], ...patch },
      },
    }));
  }
  function markRead(owner) {
    if (!session) return;
    updateChatPreference(owner, { unread: false });
    const ids = messages
      .filter((item) => item.owner === owner && item.from !== "shop")
      .map((item) => item.id);
    setReadMessages((old) => ({
      ...old,
      [session.id]: [...new Set([...(old[session.id] || []), ...ids])],
    }));
  }
  function markUnread(owner) {
    if (!session) return;
    const ids = messages
      .filter((item) => item.owner === owner)
      .map((item) => item.id);
    setReadMessages((old) => ({
      ...old,
      [session.id]: (old[session.id] || []).filter((id) => !ids.includes(id)),
    }));
    updateChatPreference(owner, { unread: true });
  }
  async function saveProduct(product, existingId) {
    const category = categoryRows.find((row) => row.name === product.category);
    const body = {
      name: product.name,
      category_id: category?.id,
      description: product.description,
      images: (product.images || [])
        .filter(Boolean)
        .map((image, index) =>
          typeof image === "string"
            ? { id: String(index), url: image, sort_order: index }
            : image,
        ),
      image: product.image || "",
      attributes: product.attributes || [],
      is_active: product.active,
      is_pinned: product.featured,
      allow_deposit: product.deposit,
      deposit_rate: product.depositRate,
      variants: product.variants.map((variant) => ({
        id: variant.id || crypto.randomUUID(),
        label: variant.label,
        color: variant.color || "",
        price: variant.price,
        old_price: variant.oldPrice ?? null,
        stock_quantity: variant.stock,
      })),
    };
    if (existingId) await api.adminProducts.update(existingId, body);
    else await api.adminProducts.create(body);
    await loadProducts();
  }
  async function removeProducts(ids) {
    const { data } = await api.adminProducts.bulkDelete({ ids });
    await loadProducts();
    if (data.failed.length) throw new Error("Bulk operation failed");
  }
  async function setProducts(update) {
    const next = typeof update === "function" ? update(products) : update;
    const removed = products.filter(
      (item) => !next.some((row) => row.id === item.id),
    );
    if (removed.length) await removeProducts(removed.map((item) => item.id));
    for (const item of next) {
      const previous = products.find((row) => row.id === item.id);
      if (JSON.stringify(item) !== JSON.stringify(previous))
        await saveProduct(item, previous?.id);
    }
  }
  async function saveCategory(name, previousName) {
    const row = categoryRows.find((item) => item.name === previousName);
    if (row) await api.adminCategories.update(row.id, { name });
    else await api.adminCategories.create({ name });
    await Promise.all([loadCategories(), loadProducts()]);
  }
  async function removeCategories(names) {
    const { data } = await api.adminCategories.bulkDelete({
      ids: categoryRows
        .filter((row) => names.includes(row.name))
        .map((row) => row.id),
    });
    await loadCategories();
    if (data.failed.length) throw new Error("Bulk operation failed");
  }
  async function saveUser(values, id) {
    const body = {
      name: values.name,
      email: values.email,
      role: values.role,
      is_active: values.active,
      ...(values.password ? { password: values.password } : {}),
    };
    if (id) await api.adminUsers.update(id, body);
    else await api.adminUsers.create(body);
    await loadUsers();
  }
  async function removeUsers(ids) {
    const { data } = await api.adminUsers.bulkDelete({ ids });
    await loadUsers();
    if (data.failed.length) throw new Error("Bulk operation failed");
  }
  async function removeOrders(ids) {
    const { data } = await api.adminOrders.bulkDelete({ ids });
    await loadOrders();
    return data;
  }
  async function updateOrder(order) {
    const status =
      order.status === managementOrderLabels[order.statusCode]
        ? order.statusCode
        : Object.keys(orderLabels).find(
            (key) => managementOrderLabels[key] === order.status,
          );
    if (!status) throw new Error("Invalid order status");
    const terminal = ["cancelled", "refunded"].includes(status);
    await api.adminOrders.update(order.id, {
      status,
      note: order.note,
      ...(terminal
        ? {}
        : { carrier: order.carrier, tracking_number: order.tracking }),
    });
    await Promise.all([loadOrders(), loadProducts()]);
  }
  async function adjustInventory(body) {
    await api.adminInventory.adjust(body, {
      idempotencyKey: crypto.randomUUID(),
    });
    await Promise.all([loadProducts(), loadStockHistory()]);
  }
  async function saveVoucher(voucher, existingId) {
    if (existingId) await api.adminVouchers.update(existingId, voucher);
    else await api.adminVouchers.create(voucher);
    await loadVouchers();
  }
  async function removeVouchers(ids) {
    const { data } = await api.adminVouchers.bulkDelete({ ids });
    await loadVouchers();
    return data;
  }
  async function reply(owner, content) {
    const message = messages.find((item) => item.owner === owner);
    if (!message?.conversationId) throw new Error("Conversation not found");
    await api.adminChat.sendMessage(message.conversationId, {
      content,
      client_message_id: crypto.randomUUID(),
    });
    if (sessionRef.current === session?.id) markRead(owner);
    await loadMessages();
  }
  async function startConversation(email, content) {
    await api.adminChat.create({
      email,
      content,
      client_message_id: crypto.randomUUID(),
    });
    // Tạo lại hội thoại phải hiện lại nếu quản lý đã ẩn hội thoại cũ.
    updateChatPreference(email, { hidden: false });
    await loadMessages();
  }
  const setSession = async (value) => {
    if (!value) return shop.logout();
    const { data } = await api.auth.getProfile();
    shop.setUser(data);
  };
  return (
    <ManagementContext.Provider
      value={{
        session,
        setSession,
        products,
        setProducts,
        saveProduct,
        removeProducts,
        categories: categoryRows.map((row) => row.name),
        saveCategory,
        removeCategories,
        orders,
        updateOrder,
        removeOrders,
        users,
        saveUser,
        removeUsers,
        messages,
        reply,
        startConversation,
        refreshMessages: loadMessages,
        stockHistory,
        vouchers,
        saveVoucher,
        removeVouchers,
        adjustInventory,
        lowStockLimit,
        setLowStockLimit,
        hiddenInventory,
        setHiddenInventory,
        hiddenPayments,
        setHiddenPayments,
        readMessageIds: readMessages[session?.id] || [],
        markRead,
        markUnread,
        chatPreference,
        updateChatPreference,
        customers: [
          ...users.filter((item) => item.role === "customer"),
          ...orders.map((item) => ({
            email: item.owner,
            name: item.recipient?.name,
          })),
        ],
        loading,
        error,
        refresh,
        loadOrders,
      }}
    >
      {children}
    </ManagementContext.Provider>
  );
}
