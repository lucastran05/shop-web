import type {
  ApiResponse,
  ID,
  ISODate,
  KeywordQuery,
  ListResponse,
  PageQuery,
  Person,
} from "./common.types";
import type {
  HttpClient,
  IdempotentOptions,
  RequestOptions,
} from "./http-client";

export interface InventoryQuery extends KeywordQuery {
  low_stock?: boolean;
  sort?: "name" | "stock_asc" | "stock_desc";
}
export interface InventoryItem {
  product_id: ID;
  product_name: string;
  variant_id: ID;
  variant_label: string;
  color: string;
  stock_quantity: number;
  is_low_stock: boolean;
}
export interface InventoryResponse extends ListResponse<InventoryItem> {
  low_stock_threshold: number;
}
export interface AdjustmentRequest {
  product_id: ID;
  variant_id: ID;
  delta: number;
  reason: string;
}
export interface Adjustment extends AdjustmentRequest {
  id: ID;
  stock_before: number;
  stock_after: number;
  actor: Omit<Person, "id"> & { id: ID | null };
  created_at: ISODate;
}
export interface AdjustmentHistory extends Adjustment {
  product_name: string;
  variant_label: string;
}
export interface AdjustmentsQuery extends PageQuery {
  product_id?: ID;
  variant_id?: ID;
}
export class AdminInventoryService {
  constructor(private readonly http: HttpClient) {}
  list(
    query?: InventoryQuery,
    options?: RequestOptions,
  ): Promise<InventoryResponse> {
    return this.http.get("/admin/inventory", query, options);
  }
  adjust(
    body: AdjustmentRequest,
    options: IdempotentOptions,
  ): Promise<ApiResponse<Adjustment>> {
    return this.http.idempotentPost(
      "/admin/inventory/adjustments",
      body,
      options,
    );
  }
  adjustments(
    query?: AdjustmentsQuery,
    options?: RequestOptions,
  ): Promise<ListResponse<AdjustmentHistory>> {
    return this.http.get("/admin/inventory/adjustments", query, options);
  }
}
