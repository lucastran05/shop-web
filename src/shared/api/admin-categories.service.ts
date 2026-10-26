import type {
  ApiResponse,
  BulkDeleteRequest,
  BulkDeleteResult,
  DeletedResult,
  ID,
} from "./common.types";
import type { Category } from "./products.service";
import { pathId, type HttpClient, type RequestOptions } from "./http-client";

export interface CategoryRequest {
  name: string;
}
export type AdminCategory = Required<Category>;
export class AdminCategoriesService {
  constructor(private readonly http: HttpClient) {}
  list(options?: RequestOptions): Promise<ApiResponse<AdminCategory[]>> {
    return this.http.get("/admin/categories", undefined, options);
  }
  create(
    body: CategoryRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<AdminCategory>> {
    return this.http.post("/admin/categories", body, options);
  }
  update(
    id: ID,
    body: CategoryRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<AdminCategory>> {
    return this.http.patch(`/admin/categories/${pathId(id)}`, body, options);
  }
  delete(
    id: ID,
    options?: RequestOptions,
  ): Promise<ApiResponse<DeletedResult>> {
    return this.http.delete(`/admin/categories/${pathId(id)}`, options);
  }
  bulkDelete(
    body: BulkDeleteRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<BulkDeleteResult>> {
    return this.http.post("/admin/categories/bulk-delete", body, options);
  }
}
