import type { ApiResponse, ID, ISODate } from "./common.types";
import type { HttpClient, RequestOptions } from "./http-client";

export interface SocialLink {
  label: string;
  url: string;
}
export interface ShopContact {
  address: string;
  phone: string;
  email: string;
  map_url: string;
  social_links: SocialLink[];
}
export interface Shop {
  id: ID;
  name: string;
  description: string;
  business_mode: string;
  contact: ShopContact;
  updated_at: ISODate;
}
export class ShopService {
  constructor(private readonly http: HttpClient) {}
  get(options?: RequestOptions): Promise<ApiResponse<Shop>> {
    return this.http.get("/api/v1/shop", undefined, options);
  }
}
