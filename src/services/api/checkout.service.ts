import type { ApiResponse, ID, ISODate } from "./common.types";
import type { AvailableLineItem, CartItemRequest } from "./cart.service";
import type {
  HttpClient,
  IdempotentOptions,
  RequestOptions,
} from "./http-client";
import type { CreatedOrder } from "./orders.service";

export type PaymentMethod =
  "vietqr" | "momo" | "cod" | "card" | "qr" | "bank_transfer";
export type PaymentMode = "deposit" | "full";
export type DeliveryMethod = "standard" | "express" | "pickup";
export interface Recipient {
  name: string;
  phone: string;
  full_address: string;
  note?: string;
}
export interface RecipientRequest {
  name: string;
  phone: string;
  province_code?: string;
  ward_code?: string;
  street_address?: string;
  full_address?: string;
}
export interface QuoteOptions {
  address_id?: ID;
  recipient?: RecipientRequest;
  delivery_method: DeliveryMethod;
  coupon_code?: string;
  payment_method: PaymentMethod;
  payment_mode: PaymentMode;
  deposit_rate?: number;
  note?: string;
}
export type QuoteRequest = QuoteOptions &
  (
    | { cart_item_ids: ID[]; items?: never }
    | { items: CartItemRequest[]; cart_item_ids?: never }
  );
export interface Amounts {
  total_amount: number;
  deposit_amount: number;
  paid_amount: number;
  refunded_amount: number;
  held_amount: number;
  remaining_amount: number;
}
export interface Quote extends Amounts {
  quote_id: ID;
  expires_at: ISODate;
  items: AvailableLineItem[];
  recipient: Recipient;
  delivery_method: DeliveryMethod;
  coupon: { code: string | null; discount_amount: number } | null;
  allowed_payment_methods: PaymentMethod[];
  allowed_deposit_rates: number[];
  subtotal: number;
  shipping_fee: number;
  discount_amount: number;
  deposit_rate: number;
  amount_due_now: number;
  currency: string;
  payment_method?: PaymentMethod;
  payment_mode?: PaymentMode;
  note?: string;
  removed_cart_item_ids?: ID[];
  user_id?: ID;
}
export interface CreateOrderRequest {
  quote_id: ID;
  note?: string;
}
export class CheckoutService {
  constructor(private readonly http: HttpClient) {}
  quote(
    body: QuoteRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<Quote>> {
    return this.http.post("/api/v1/checkout/quote", body, options);
  }
  createOrder(
    body: CreateOrderRequest,
    options: IdempotentOptions,
  ): Promise<ApiResponse<CreatedOrder>> {
    return this.http.idempotentPost("/api/v1/orders", body, options);
  }
}
