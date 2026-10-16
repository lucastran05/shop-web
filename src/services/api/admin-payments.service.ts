import type { ApiResponse, ID, ISODate } from "./common.types";
import type { PaymentMode } from "./checkout.service";
import type { OrderCore } from "./orders.service";
import { pathId, type HttpClient, type IdempotentOptions } from "./http-client";

export interface ConfirmPaymentRequest {
  kind: PaymentMode;
  amount: number;
  transaction_reference: string;
  note?: string;
}
export interface RefundRequest {
  amount: number;
  reason: string;
  transaction_reference: string;
}
export interface PaymentConfirmation {
  id: ID;
  order_id: ID;
  kind: PaymentMode;
  amount: number;
  transaction_reference: string;
  status: string;
  confirmed_by: string | null;
  confirmed_at: ISODate;
  order: OrderCore;
}
export interface Refund {
  id: ID;
  order_id: ID;
  amount: number;
  status: string;
  reason: string;
  transaction_reference: string;
  requested_at: ISODate;
  completed_at: ISODate | null;
  order: OrderCore;
}
export class AdminPaymentsService {
  constructor(private readonly http: HttpClient) {}
  confirm(
    orderId: ID,
    body: ConfirmPaymentRequest,
    options: IdempotentOptions,
  ): Promise<ApiResponse<PaymentConfirmation>> {
    return this.http.idempotentPost(
      `/admin/orders/${pathId(orderId)}/payment-confirmations`,
      body,
      options,
    );
  }
  refund(
    orderId: ID,
    body: RefundRequest,
    options: IdempotentOptions,
  ): Promise<ApiResponse<Refund>> {
    return this.http.idempotentPost(
      `/admin/orders/${pathId(orderId)}/refunds`,
      body,
      options,
    );
  }
}
