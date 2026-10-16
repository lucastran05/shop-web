import type {
  ApiResponse,
  Customer,
  ID,
  ISODate,
  KeywordQuery,
  ListResponse,
} from "./common.types";
import type { PaymentMethod } from "./checkout.service";
import type {
  Order,
  OrderAction,
  OrderCore,
  OrderStatus,
  PaymentStatus,
  Shipment,
} from "./orders.service";
import { pathId, type HttpClient, type RequestOptions } from "./http-client";

export interface AdminOrdersQuery extends KeywordQuery {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  view?: "payments";
}
export interface OrderCustomer extends Omit<Customer, "id"> {
  id: ID | null;
  phone?: string;
}
export interface AdminOrderSummary extends OrderCore {
  customer: OrderCustomer;
  recipient_name: string;
  payment_method: PaymentMethod;
  allowed_actions: OrderAction[];
}
export interface NextOrderStatus {
  code: OrderStatus;
  label: string;
}
export interface AdminOrder extends Order {
  customer: OrderCustomer;
  allowed_next_statuses: NextOrderStatus[];
  completed_at?: ISODate | null;
}
export interface UpdateOrderRequest {
  status?: OrderStatus;
  carrier?: string;
  tracking_number?: string;
  note?: string;
  expected_updated_at?: ISODate;
}
export interface UpdateOrderResult {
  id: ID;
  code: string;
  status: OrderStatus;
  status_label: string;
  shipment: Shipment;
  allowed_next_statuses: NextOrderStatus[];
}
export class AdminOrdersService {
  constructor(private readonly http: HttpClient) {}
  list(
    query?: AdminOrdersQuery,
    options?: RequestOptions,
  ): Promise<ListResponse<AdminOrderSummary>> {
    return this.http.get("/admin/orders", query, options);
  }
  get(id: ID, options?: RequestOptions): Promise<ApiResponse<AdminOrder>> {
    return this.http.get(`/admin/orders/${pathId(id)}`, undefined, options);
  }
  update(
    id: ID,
    body: UpdateOrderRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<UpdateOrderResult>> {
    return this.http.patch(`/admin/orders/${pathId(id)}`, body, options);
  }
}
