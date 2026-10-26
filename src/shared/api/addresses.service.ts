import type { ApiResponse, ID, ISODate, DeletedResult } from "./common.types";
import { pathId, type HttpClient, type RequestOptions } from "./http-client";

export interface AddressRequest {
  recipient_name: string;
  recipient_phone: string;
  province_code: string;
  ward_code: string;
  street_address: string;
  is_default?: boolean;
}
export type UpdateAddressRequest = Partial<AddressRequest>;
export interface Address extends AddressRequest {
  id: ID;
  province_name: string;
  ward_name: string;
  full_address: string;
  is_default: boolean;
  user_id?: ID;
  created_at?: ISODate;
  updated_at?: ISODate;
}
export interface Province {
  code: string;
  name: string;
}
export interface Ward extends Province {
  province_code: string;
}
export interface WardsQuery {
  province_code: string;
}
export interface DefaultAddressResult {
  id: ID;
  is_default: true;
  default_address_id: ID;
}
export class AddressesService {
  constructor(private readonly http: HttpClient) {}
  list(options?: RequestOptions): Promise<ApiResponse<Address[]>> {
    return this.http.get("/api/v1/me/addresses", undefined, options);
  }
  create(
    body: AddressRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<Address>> {
    return this.http.post("/api/v1/me/addresses", body, options);
  }
  update(
    id: ID,
    body: UpdateAddressRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<Address>> {
    return this.http.patch(`/api/v1/me/addresses/${pathId(id)}`, body, options);
  }
  delete(
    id: ID,
    options?: RequestOptions,
  ): Promise<ApiResponse<DeletedResult & { default_address_id: ID | null }>> {
    return this.http.delete(`/api/v1/me/addresses/${pathId(id)}`, options);
  }
  setDefault(
    id: ID,
    options?: RequestOptions,
  ): Promise<ApiResponse<DefaultAddressResult>> {
    return this.http.patch(
      `/api/v1/me/addresses/${pathId(id)}/default`,
      undefined,
      options,
    );
  }
  provinces(options?: RequestOptions): Promise<ApiResponse<Province[]>> {
    return this.http.get("/api/v1/locations/provinces", undefined, options);
  }
  wards(
    query: WardsQuery,
    options?: RequestOptions,
  ): Promise<ApiResponse<Ward[]>> {
    return this.http.get("/api/v1/locations/wards", query, options);
  }
}
