import type {
  ApiResponse,
  CursorQuery,
  Customer,
  ID,
  KeywordQuery,
  ListResponse,
} from "./common.types";
import type {
  Conversation,
  Message,
  MessagesResponse,
  SendMessageRequest,
} from "./chat-and-notifications.service";
import { pathId, type HttpClient, type RequestOptions } from "./http-client";

export interface AdminMessagesResponse extends MessagesResponse {
  customer: Customer;
}
export interface AdminSendMessageResponse extends ApiResponse<Message> {
  customer: Customer | null;
}
export class AdminChatService {
  constructor(private readonly http: HttpClient) {}
  list(
    query?: KeywordQuery,
    options?: RequestOptions,
  ): Promise<ListResponse<Conversation>> {
    return this.http.get("/admin/conversations", query, options);
  }
  messages(
    id: ID,
    query?: CursorQuery,
    options?: RequestOptions,
  ): Promise<AdminMessagesResponse> {
    return this.http.get(
      `/admin/conversations/${pathId(id)}/messages`,
      query,
      options,
    );
  }
  sendMessage(
    id: ID,
    body: SendMessageRequest,
    options?: RequestOptions,
  ): Promise<AdminSendMessageResponse> {
    return this.http.post(
      `/admin/conversations/${pathId(id)}/messages`,
      body,
      options,
    );
  }
}
