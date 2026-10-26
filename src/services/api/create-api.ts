import { HttpClient, type HttpClientConfig } from "./http-client";
import { AuthService } from "./auth.service";
import { AddressesService } from "./addresses.service";
import { ProductsService } from "./products.service";
import { ReviewsService } from "./reviews.service";
import { CartService } from "./cart.service";
import { CheckoutService } from "./checkout.service";
import { PaymentsService } from "./payments.service";
import { OrdersService } from "./orders.service";
import { ChatAndNotificationsService } from "./chat-and-notifications.service";
import { ShopService } from "./shop.service";
import { AdminProductsService } from "./admin-products.service";
import { AdminCategoriesService } from "./admin-categories.service";
import { AdminInventoryService } from "./admin-inventory.service";
import { AdminOrdersService } from "./admin-orders.service";
import { AdminPaymentsService } from "./admin-payments.service";
import { AdminChatService } from "./admin-chat.service";
import { AdminDashboardReportsService } from "./admin-dashboard-reports.service";
import { AdminUsersService } from "./admin-users.service";
import { AdminSettingsShopService } from "./admin-settings-shop.service";
import { AdminVouchersService, VouchersService } from "./admin-vouchers.service";

/** Create separate instances for customer and management sessions if both are used at once. */
export function createApi(config: HttpClientConfig) {
  const http = new HttpClient(config);
  return {
    http,
    auth: new AuthService(http),
    addresses: new AddressesService(http),
    products: new ProductsService(http),
    reviews: new ReviewsService(http),
    cart: new CartService(http),
    checkout: new CheckoutService(http),
    payments: new PaymentsService(http),
    orders: new OrdersService(http),
    chatAndNotifications: new ChatAndNotificationsService(http),
    shop: new ShopService(http),
    adminProducts: new AdminProductsService(http),
    adminCategories: new AdminCategoriesService(http),
    adminInventory: new AdminInventoryService(http),
    adminOrders: new AdminOrdersService(http),
    adminPayments: new AdminPaymentsService(http),
    adminChat: new AdminChatService(http),
    adminDashboardReports: new AdminDashboardReportsService(http),
    adminUsers: new AdminUsersService(http),
    adminSettingsShop: new AdminSettingsShopService(http),
    adminVouchers: new AdminVouchersService(http),
    vouchers: new VouchersService(http),
  };
}
export type ShopApi = ReturnType<typeof createApi>;
