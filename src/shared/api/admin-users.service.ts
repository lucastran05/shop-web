import type {
  ApiResponse,
  BulkDeleteRequest,
  BulkDeleteResult,
  DeletedResult,
  ID,
  KeywordQuery,
  ListResponse,
} from "./common.types";
import type { Role, User } from "./auth.service";
import { pathId, type HttpClient, type RequestOptions } from "./http-client";

export type AdminUser = Omit<User, "default_address_id">;
export interface AdminUsersQuery extends KeywordQuery {
  role?: Role;
  is_active?: boolean;
}
export interface CreateUserRequest {
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  is_active: boolean;
  password?: string;
}
export type UpdateUserRequest = Partial<CreateUserRequest>;
export class AdminUsersService {
  constructor(private readonly http: HttpClient) {}
  list(
    query?: AdminUsersQuery,
    options?: RequestOptions,
  ): Promise<ListResponse<AdminUser>> {
    return this.http.get("/admin/users", query, options);
  }
  create(
    body: CreateUserRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<AdminUser>> {
    return this.http.post("/admin/users", body, options);
  }
  update(
    id: ID,
    body: UpdateUserRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<AdminUser>> {
    return this.http.patch(`/admin/users/${pathId(id)}`, body, options);
  }
  delete(
    id: ID,
    options?: RequestOptions,
  ): Promise<ApiResponse<DeletedResult>> {
    return this.http.delete(`/admin/users/${pathId(id)}`, options);
  }
  bulkDelete(
    body: BulkDeleteRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<BulkDeleteResult>> {
    return this.http.post("/admin/users/bulk-delete", body, options);
  }
}
