import type { ApiResponse } from "./common.types";
import type { Shop, ShopContact } from "./shop.service";
import type { HttpClient, RequestOptions } from "./http-client";

export interface UpdateShopRequest {
  name?: string;
  description?: string;
  business_mode?: string;
  contact?: Partial<ShopContact>;
}
export class AdminSettingsShopService {
  constructor(private readonly http: HttpClient) {}
  get(options?: RequestOptions): Promise<ApiResponse<Shop>> {
    return this.http.get("/admin/settings/shop", undefined, options);
  }
  update(
    body: UpdateShopRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<Shop>> {
    return this.http.patch("/admin/settings/shop", body, options);
  }
}
