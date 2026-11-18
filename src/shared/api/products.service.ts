import type {
  ApiResponse,
  ID,
  ISODate,
  ListResponse,
  PageQuery,
} from "./common.types";
import { pathId, type HttpClient, type RequestOptions } from "./http-client";

export interface CategoryRef {
  id: ID | null;
  name: string;
}
export interface Category {
  id: ID;
  name: string;
  product_count: number;
  created_at?: ISODate;
  updated_at?: ISODate;
}
export interface ProductImage {
  id: ID;
  url: string;
  alt_text?: string | null;
  sort_order?: number;
}
export interface ProductAttribute {
  label: string;
  value: string;
}
/** Original Pexels photo of a stem and its attribution (set by `npm run import:stems`). */
export interface StemPhoto {
  url: string;
  pexels_id: number;
  photographer: string;
  photographer_url: string;
  pexels_url: string;
  background_removed: boolean;
}
export interface ProductVariant {
  id: ID;
  label: string;
  color: string;
  image?: string;
  price: number;
  old_price: number | null;
  stock_quantity: number;
  /** Transparent PNG of a single stem, used by the custom bouquet preview. */
  stem_image?: string | null;
  stem_photo?: StemPhoto | null;
}
export interface ProductSummary {
  id: ID;
  name: string;
  image_url: string;
  category: CategoryRef;
  price: number;
  old_price: number | null;
  stock_quantity: number;
  is_pinned: boolean;
  /** Sold per stem (price = one stem); used to build custom bouquets. */
  sold_by_stem?: boolean;
}
export interface Product extends Omit<ProductSummary, "image_url"> {
  description: string;
  flower_species: string[];
  images: ProductImage[];
  variants: ProductVariant[];
  attributes: ProductAttribute[];
  allow_deposit: boolean;
  deposit_rate: number;
  created_at: ISODate;
  updated_at: ISODate;
  is_active?: boolean;
}
export interface ProductsQuery extends PageQuery {
  flower_species?: string;
  keyword?: string;
  category_id?: ID;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  is_pinned?: boolean;
  sold_by_stem?: boolean;
  sort?: "price_asc" | "price_desc" | "newest" | "popular";
}
export interface ProductsResponse extends ListResponse<ProductSummary> {
  filters: { min_price: number; max_price: number };
}
export class ProductsService {
  constructor(private readonly http: HttpClient) {}
  featured(page = 1, options?: RequestOptions): Promise<ProductsResponse> {
    return this.http.get("/api/v1/products/featured", { page }, options);
  }
  list(
    query?: ProductsQuery,
    options?: RequestOptions,
  ): Promise<ProductsResponse> {
    return this.http.get("/api/v1/products", query, options);
  }
  get(id: ID, options?: RequestOptions): Promise<ApiResponse<Product>> {
    return this.http.get(`/api/v1/products/${pathId(id)}`, undefined, options);
  }
  categories(options?: RequestOptions): Promise<ApiResponse<Category[]>> {
    return this.http.get("/api/v1/categories", undefined, options);
  }
}
