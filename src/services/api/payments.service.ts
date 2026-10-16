import type { ApiResponse, ID, ISODate, JsonValue } from "./common.types";
import type { PaymentMethod, PaymentMode } from "./checkout.service";
import type { DepositStatus, PaymentStatus } from "./orders.service";
import {
  pathId,
  type HttpClient,
  type IdempotentOptions,
  type RequestOptions,
} from "./http-client";

export interface PaymentSessionRequest {
  method: Exclude<PaymentMethod, "cod">;
  purpose: PaymentMode;
}
export interface PaymentSession {
  id: ID;
  order_id: ID;
  purpose: PaymentMode;
  method: PaymentMethod;
  provider: string;
  status:
    "pending" | "processing" | "succeeded" | "failed" | "expired" | "cancelled";
  amount: number;
  currency: string;
  qr_payload: string | null;
  qr_image_url: string | null;
  payment_url: string | null;
  expires_at: ISODate;
  paid_at: ISODate | null;
  failure_code: string | null;
  created_at: ISODate;
}
export interface PaymentSessionDetail extends PaymentSession {
  order: {
    id: ID;
    payment_status: PaymentStatus;
    deposit_status: DepositStatus;
    deposit_paid_at: ISODate | null;
    paid_amount: number;
    remaining_amount: number;
  };
}
export interface LegacyPayment {
  id: ID;
  order_id: ID;
  user_id: ID | null;
  amount: number | string;
  payment_method: string;
  payment_type: string;
  status: string;
  transaction_id: string | null;
  note: string;
  metadata: JsonValue;
  created_at: ISODate;
  updated_at: ISODate;
  user_name?: string;
  user_email?: string;
}
export class PaymentsService {
  constructor(private readonly http: HttpClient) {}
  createSession(
    orderId: ID,
    body: PaymentSessionRequest,
    options: IdempotentOptions,
  ): Promise<ApiResponse<PaymentSession>> {
    return this.http.idempotentPost(
      `/api/v1/orders/${pathId(orderId)}/payment-sessions`,
      body,
      options,
    );
  }
  get(
    id: ID,
    options?: RequestOptions,
  ): Promise<ApiResponse<PaymentSessionDetail | { payment: LegacyPayment }>> {
    return this.http.get(`/api/v1/payments/${pathId(id)}`, undefined, options);
  }
}
