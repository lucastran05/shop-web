import type { ApiResponse, ID, ISODate } from "./common.types";
import { pathId, type HttpClient, type RequestOptions } from "./http-client";

export interface CartItemRequest {
  product_id: ID;
  variant_id: ID;
  quantity: number;
}
export interface QuantityRequest {
  quantity: number;
}
export interface LineItem extends CartItemRequest {
  product_name: string;
  variant_label: string;
  color: string;
  image_url: string;
  unit_price: number;
  line_total: number;
}
export interface AvailableLineItem extends LineItem {
  allow_deposit: boolean;
  deposit_rate: number;
  stock_quantity: number;
  is_available: boolean;
}
export type CartItemType = "product" | "custom_bouquet";
/** Kiểu gói khách chọn cho bó; phụ phí giấy đã nằm trong unit_price của dòng. */
export interface BouquetStyle {
  wrap: string;
  wrap_name: string;
  wrap_price: number;
  height: string;
  height_name: string;
}
export interface StemLengthRange {
  min: number;
  max: number;
  step: number;
  default: number;
}
export interface BouquetWrapOption {
  id: string;
  name: string;
  price: number;
  colors: string[];
  description: string;
}
export interface BouquetHeightOption {
  id: string;
  name: string;
  scale: number;
  spread: number;
}
export interface BouquetOptions {
  wraps: BouquetWrapOption[];
  heights: BouquetHeightOption[];
  stem_length: StemLengthRange;
}
/** One stem flower (product + colour variant) inside a custom bouquet, priced by the server. */
export interface BouquetComponent {
  product_id: ID;
  variant_id: ID;
  product_name: string;
  variant_label: string;
  color: string;
  stems: number;
  stem_length?: number;
  unit_price: number;
  line_total: number;
  image_url: string;
  stem_image?: string | null;
  stock_quantity?: number;
  is_available?: boolean;
}
/** Custom bouquet lines have no product_id; their variant_id is "custom:<hash>". */
export interface CartItem extends Omit<AvailableLineItem, "product_id"> {
  id: ID;
  product_id: ID | null;
  item_type: CartItemType;
  components?: BouquetComponent[];
  style?: BouquetStyle | null;
}
/** Only these fields are read by CART05; any price sent by the client is ignored. */
export interface BouquetStemRequest {
  product_id: ID;
  variant_id: ID;
  stems: number;
  /** Chiều dài cành khách yêu cầu cắt cho riêng loại hoa này (cm). */
  stem_length?: number;
}
export interface CustomBouquetRequest {
  items: BouquetStemRequest[];
  quantity?: number;
  wrap?: string;
  height?: string;
}
export interface Cart {
  id: ID;
  line_count: number;
  item_count: number;
  subtotal: number;
  currency: string;
  updated_at: ISODate;
  items: CartItem[];
}
export class CartService {
  constructor(private readonly http: HttpClient) {}
  get(options?: RequestOptions): Promise<ApiResponse<Cart>> {
    return this.http.get("/api/v1/cart", undefined, options);
  }
  add(
    body: CartItemRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<Cart>> {
    return this.http.post("/api/v1/cart/items", body, options);
  }
  /** CART06: wrapping papers and bouquet shapes on offer (public). */
  bouquetOptions(
    options?: RequestOptions,
  ): Promise<ApiResponse<BouquetOptions>> {
    return this.http.get("/api/v1/bouquets/options", undefined, options);
  }
  /** CART05: add a custom bouquet built from flowers sold by the stem. */
  addBouquet(
    body: CustomBouquetRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<Cart>> {
    return this.http.post("/api/v1/cart/bouquets", body, options);
  }
  update(
    id: ID,
    body: QuantityRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<Cart>> {
    return this.http.patch(`/api/v1/cart/items/${pathId(id)}`, body, options);
  }
  remove(id: ID, options?: RequestOptions): Promise<ApiResponse<Cart>> {
    return this.http.delete(`/api/v1/cart/items/${pathId(id)}`, options);
  }
}
