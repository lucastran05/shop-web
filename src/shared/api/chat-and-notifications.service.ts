import type {
  ApiResponse,
  CursorPagination,
  CursorQuery,
  Customer,
  ID,
  ISODate,
  ListResponse,
  PageQuery,
  Person,
} from "./common.types";
import { pathId, type HttpClient, type RequestOptions } from "./http-client";

export type SenderRole = "customer" | "staff" | "admin" | "manager" | "shop";
export interface MessagePreview {
  id: ID;
  content: string;
  sender_role: SenderRole;
  created_at: ISODate;
  is_read?: boolean;
}
export interface Message extends MessagePreview {
  conversation_id: ID;
  sender: Omit<Person, "id"> & { id: ID | null };
  client_message_id?: string | null;
}
export interface Conversation {
  id: ID;
  customer: Customer;
  last_message: MessagePreview | null;
  created_at?: ISODate;
  updated_at?: ISODate;
}
export interface SendMessageRequest {
  content: string;
  client_message_id: string;
}
export interface MessagesResponse extends ApiResponse<Message[]> {
  pagination: CursorPagination;
}
export interface Notification {
  id: ID;
  title: string;
  content: string;
  type: string;
  target_type: string | null;
  target_id: ID | null;
  is_read: boolean;
  created_at: ISODate;
  message?: string;
}
export interface NotificationsQuery extends PageQuery {
  type?: string;
  unread_only?: boolean;
}
export interface NotificationsResponse extends ListResponse<Notification> {
  unread_count: number;
}
export interface ReadNotificationResponse extends ApiResponse<{
  id: ID;
  is_read: true;
  read_at: ISODate;
}> {
  unread_count: number;
}
export interface ReadAllNotificationsResponse extends ApiResponse<{
  updated_count: number;
  read_at: ISODate;
}> {
  unread_count: number;
}
export class ChatAndNotificationsService {
  constructor(private readonly http: HttpClient) {}
  openConversation(
    options?: RequestOptions,
  ): Promise<ApiResponse<Conversation>> {
    return this.http.post("/api/v1/conversations", undefined, options);
  }
  messages(
    id: ID,
    query?: CursorQuery,
    options?: RequestOptions,
  ): Promise<MessagesResponse> {
    return this.http.get(
      `/api/v1/conversations/${pathId(id)}/messages`,
      query,
      options,
    );
  }
  sendMessage(
    id: ID,
    body: SendMessageRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<Message>> {
    return this.http.post(
      `/api/v1/conversations/${pathId(id)}/messages`,
      body,
      options,
    );
  }
  markConversationRead(options?: RequestOptions): Promise<ApiResponse<{
    updatedCount: number;
  }>> {
    return this.http.patch("/api/v1/chat/read-all", undefined, options);
  }
  notifications(
    query: NotificationsQuery = {},
    options?: RequestOptions,
  ): Promise<NotificationsResponse> {
    // Explicit pagination selects the documented array envelope in the current backend.
    return this.http.get(
      "/api/v1/notifications",
      { ...query, page: query.page ?? 1, limit: query.limit ?? 10 },
      options,
    );
  }
  readNotification(
    id: ID,
    options?: RequestOptions,
  ): Promise<ReadNotificationResponse> {
    return this.http.patch(
      `/api/v1/notifications/${pathId(id)}/read`,
      undefined,
      options,
    );
  }
  readAllNotifications(
    options?: RequestOptions,
  ): Promise<ReadAllNotificationsResponse> {
    return this.http.post("/api/v1/notifications/read-all", undefined, options);
  }
}
