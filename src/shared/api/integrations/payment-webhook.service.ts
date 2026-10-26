import type { JsonValue, MessageResponse } from "../common.types";
import { pathId, type HttpClient, type RequestOptions } from "../http-client";

/** Backend integration only: never generate or store gateway signing secrets in the browser. */
export interface GatewayWebhookRequest {
  order_id: string;
  amount: number;
  transaction_id: string;
  [key: string]: JsonValue;
}
export class PaymentWebhookService {
  constructor(private readonly http: HttpClient) {}
  deliver(
    provider: string,
    body: GatewayWebhookRequest,
    options?: RequestOptions,
  ): Promise<MessageResponse> {
    return this.http.publicPost(
      `/api/v1/payments/webhooks/${pathId(provider)}`,
      body,
      options,
    );
  }
}
