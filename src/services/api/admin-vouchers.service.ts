import type {
  ApiResponse,
  BulkDeleteRequest,
  BulkDeleteResult,
  DeletedResult,
  ID,
} from "./common.types";
import { pathId, type HttpClient, type RequestOptions } from "./http-client";

export type VoucherDiscountType = "percentage" | "fixed" | "free_shipping";
export interface Voucher {
  id: ID;
  code: string;
  name: string;
  discount_type: VoucherDiscountType;
  discount_value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  usage_limit: number | null;
  used_count: number;
  remaining_count: number | null;
  starts_at: string | null;
  expires_at: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}
export interface VoucherRequest {
  code: string;
  name: string;
  discount_type: VoucherDiscountType;
  discount_value: number;
  min_order_amount?: number;
  max_discount_amount?: number | null;
  usage_limit?: number | null;
  starts_at?: string | null;
  expires_at?: string | null;
  active?: boolean;
}
export type UpdateVoucherRequest = Partial<VoucherRequest>;
export interface VouchersQuery {
  keyword?: string;
  active?: boolean;
}
export interface AvailableVouchersQuery {
  subtotal?: number;
}
export interface VoucherValidationRequest {
  code: string;
  subtotal: number;
  shipping_fee: number;
}
export interface VoucherValidationResult {
  id: ID;
  code: string;
  name: string;
  discount_amount: number;
  discount_type: VoucherDiscountType;
}

export class AdminVouchersService {
  constructor(private readonly http: HttpClient) {}
  list(query?: VouchersQuery, options?: RequestOptions): Promise<ApiResponse<Voucher[]>> {
    return this.http.get("/admin/vouchers", query, options);
  }
  create(body: VoucherRequest, options?: RequestOptions): Promise<ApiResponse<Voucher>> {
    return this.http.post("/admin/vouchers", body, options);
  }
  update(id: ID, body: UpdateVoucherRequest, options?: RequestOptions): Promise<ApiResponse<Voucher>> {
    return this.http.patch(`/admin/vouchers/${pathId(id)}`, body, options);
  }
  delete(id: ID, options?: RequestOptions): Promise<ApiResponse<DeletedResult>> {
    return this.http.delete(`/admin/vouchers/${pathId(id)}`, options);
  }
  bulkDelete(body: BulkDeleteRequest, options?: RequestOptions): Promise<ApiResponse<BulkDeleteResult>> {
    return this.http.post("/admin/vouchers/bulk-delete", body, options);
  }
}

export class VouchersService {
  constructor(private readonly http: HttpClient) {}
  available(query?: AvailableVouchersQuery, options?: RequestOptions): Promise<ApiResponse<Voucher[]>> {
    return this.http.get('/api/v1/vouchers/available', query, options);
  }
  validate(body: VoucherValidationRequest, options?: RequestOptions): Promise<ApiResponse<VoucherValidationResult>> {
    return this.http.post("/api/v1/vouchers/validate", body, options);
  }
}
