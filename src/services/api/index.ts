import { createApi } from "./create-api";

export const api = createApi({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",
  timeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000),
});

export * from "./create-api";
export * from "./http-client";
export * from "./api-error";
export * from "./common.types";
export * from "./auth.service";
export * from "./addresses.service";
export * from "./products.service";
export * from "./reviews.service";
export * from "./cart.service";
export * from "./checkout.service";
export * from "./payments.service";
export * from "./orders.service";
export * from "./chat-and-notifications.service";
export * from "./shop.service";
export * from "./admin-products.service";
export * from "./admin-categories.service";
export * from "./admin-inventory.service";
export * from "./admin-orders.service";
export * from "./admin-payments.service";
export * from "./admin-chat.service";
export * from "./admin-dashboard-reports.service";
export * from "./admin-users.service";
export * from "./admin-settings-shop.service";
