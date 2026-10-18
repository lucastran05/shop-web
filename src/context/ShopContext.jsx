import { expireOrders } from "../utils/orderLifecycle";
import { useEffect, useState } from "react";
import { Context } from "./shop";
import { useSaved } from "../hooks/useSaved";
import { shopConfig } from "../constants/shop";
import { api } from "../services/api";
import { mapProductSummary } from "../services/productAdapter";
export function ShopProvider({ children }) {
  const [shopInfo, setShopInfo] = useSaved("shop-info", {
    name: shopConfig.name,
    description: shopConfig.description,
    contact: shopConfig.contact,
  });
  useEffect(() => {
    document.title = shopInfo.name || shopConfig.name;
  }, [shopInfo.name]);
  const [user, setUser] = useState(null),
    [orders, setOrders] = useSaved("orders", []),
    [messages, setMessages] = useSaved("chat", []),
    [notifications, setNotifications] = useSaved("notifications", []),
    [profiles, setProfiles] = useSaved("profiles", {}),
    [reviews, setReviews] = useSaved("reviews", []);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(null);
  useEffect(() => {
    let active = true;
    Promise.all([api.products.list({ page: 1, limit: 100 }), api.products.categories()])
      .then(([productResponse, categoryResponse]) => {
        if (!active) return;
        setProducts(productResponse.data.map(mapProductSummary));
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
        const selected = new Map(items.map((item) => [item.key, item.selected]));
        setItems(
          setItemsFromServer(response).map((item) => ({
            ...item,
            selected: selected.get(item.key) ?? true,
          })),
        );
      });
  }
  function removeCartItem(id) {
    return api.cart
      .remove(id)
      .then((response) => {
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
    const removed = items.filter((item) => !next.some((x) => x.key === item.key));
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
