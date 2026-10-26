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
  stock_quantity: number;
  is_available: boolean;
}
export interface CartItem extends AvailableLineItem {
  id: ID;
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
