import type {
  ApiResponse,
  BulkDeleteRequest,
  BulkDeleteResult,
  DeletedResult,
  ID,
  KeywordQuery,
  ListResponse,
} from "./common.types";
import type {
  CategoryRef,
  Product,
  ProductAttribute,
  ProductImage,
  ProductVariant,
} from "./products.service";
import {
  uploadForm,
  type UploadedFile,
  type UploadRequest,
} from "./reviews.service";
import { pathId, type HttpClient, type RequestOptions } from "./http-client";

export interface AdminProductsQuery extends KeywordQuery {
  category_id?: ID;
  is_active?: boolean;
  is_pinned?: boolean;
}
export interface AdminProductSummary {
  id: ID;
  name: string;
  image_url: string;
  category: CategoryRef;
  price_from: number;
  stock_quantity: number;
  is_pinned: boolean;
  is_active: boolean;
}
export type VariantRequest = Omit<ProductVariant, "id"> & { id?: ID };
export interface CreateProductRequest {
  name: string;
  category_id: ID;
  description?: string;
  flower_species?: string[];
  image_ids?: ID[];
  images?: ProductImage[];
  image?: string;
  attributes?: ProductAttribute[];
  is_active?: boolean;
  is_pinned?: boolean;
  allow_deposit?: boolean;
  deposit_rate?: number;
  variants: VariantRequest[];
}
export type UpdateProductRequest = Partial<CreateProductRequest>;
export class AdminProductsService {
  constructor(private readonly http: HttpClient) {}
  flowerSpecies(options?: RequestOptions): Promise<ApiResponse<string[]>> {
    return this.http.get("/api/v1/admin/flower-species", undefined, options);
  }
  list(
    query?: AdminProductsQuery,
    options?: RequestOptions,
  ): Promise<ListResponse<AdminProductSummary>> {
    return this.http.get("/admin/products", query, options);
  }
  get(id: ID, options?: RequestOptions): Promise<ApiResponse<Product>> {
    return this.http.get(`/admin/products/${pathId(id)}`, undefined, options);
  }
  create(
    body: CreateProductRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<Product & { product?: Product }>> {
    return this.http.post("/admin/products", body, options);
  }
  update(
    id: ID,
    body: UpdateProductRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<Product>> {
    return this.http.patch(`/admin/products/${pathId(id)}`, body, options);
  }
  delete(
    id: ID,
    options?: RequestOptions,
  ): Promise<ApiResponse<DeletedResult>> {
    return this.http.delete(`/admin/products/${pathId(id)}`, options);
  }
  bulkDelete(
    body: BulkDeleteRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<BulkDeleteResult & { deletedCount?: number }>> {
    return this.http.post("/admin/products/bulk-delete", body, options);
  }
  upload(
    body: UploadRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<UploadedFile[]>> {
    return this.http.post("/admin/uploads", uploadForm(body), options);
  }
}
