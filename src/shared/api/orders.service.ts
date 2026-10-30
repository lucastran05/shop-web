import type {
  ApiResponse,
  ID,
  ISODate,
  ListResponse,
  PageQuery,
} from "./common.types";
import type {
  Amounts,
  DeliveryMethod,
  PaymentMethod,
  PaymentMode,
  Recipient,
} from "./checkout.service";
import type { LineItem } from "./cart.service";
import { pathId, type HttpClient, type RequestOptions } from "./http-client";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "packed"
  | "shipping"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancelled"
  | "returned"
  | "refunded";
export type PaymentStatus =
  "unpaid" | "partial" | "partially_paid" | "paid" | "refunded";
export type DepositStatus = "none" | "unpaid" | "pending" | "paid" | "refunded";
export type OrderAction =
  | "cancel"
  | "pay"
  | "update_status"
  | "change_status"
  | "update_shipment"
  | "confirm_payment"
  | "refund";
export interface OrderCore extends Amounts {
  id: ID;
  code: string;
  status: OrderStatus;
  status_label: string;
  payment_status: PaymentStatus;
  deposit_status: DepositStatus;
  deposit_paid_at: ISODate | null;
  created_at: ISODate;
  updated_at: ISODate;
}
export interface CreatedOrder extends OrderCore {
  payment_method: PaymentMethod;
  payment_mode: PaymentMode;
  delivery_method: DeliveryMethod;
  amount_due_now: number;
  currency: string;
  removed_cart_item_ids: ID[];
}
export interface OrderSummary extends OrderCore {
  item_count: number;
  items_preview: Pick<
    LineItem,
    "product_name" | "variant_label" | "image_url" | "quantity"
  >[];
  allowed_actions: OrderAction[];
}
export interface Shipment {
  carrier: string;
  tracking_number: string;
  shipped_at: ISODate | null;
  delivered_at: ISODate | null;
}
export interface OrderHistory {
  id: ID;
  status: OrderStatus;
  label: string;
  note: string;
  created_at: ISODate;
}
export interface Order extends OrderCore {
  payment_method: PaymentMethod;
  payment_mode: PaymentMode;
  delivery_method: DeliveryMethod;
  subtotal: number;
  shipping_fee: number;
  discount_amount: number;
  deposit_rate: number;
  amount_due_now: number;
  currency: string;
  recipient: Recipient;
  items: LineItem[];
  shipment: Shipment | null;
  history: OrderHistory[];
  allowed_actions: OrderAction[];
}
export interface OrdersQuery extends PageQuery {
  status?: OrderStatus;
}
export interface CancelOrderRequest {
  reason: string;
}
export interface CancelOrderResult {
  id: ID;
  code: string;
  status: OrderStatus;
  status_label: string;
  refunded_amount: number;
  remaining_amount: number;
  allowed_actions: OrderAction[];
}
export class OrdersService {
  constructor(private readonly http: HttpClient) {}
  list(
    query?: OrdersQuery,
    options?: RequestOptions,
  ): Promise<ListResponse<OrderSummary>> {
    return this.http.get("/api/v1/orders", query, options);
  }
  get(id: ID, options?: RequestOptions): Promise<ApiResponse<Order>> {
    return this.http.get(`/api/v1/orders/${pathId(id)}`, undefined, options);
  }
  cancel(
    id: ID,
    body: CancelOrderRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<CancelOrderResult>> {
    return this.http.post(`/api/v1/orders/${pathId(id)}/cancel`, body, options);
  }
}
