import type {
  ApiResponse,
  ID,
  ISODate,
  SuccessResult,
  TokenPair,
} from "./common.types";
import type { HttpClient, RequestOptions } from "./http-client";

export type Role = "customer" | "manager" | "admin";
export interface User {
  id: ID;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  is_active: boolean;
  default_address_id: ID | null;
  created_at: ISODate;
  updated_at: ISODate;
}
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}
export interface LoginRequest {
  email: string;
  password: string;
}
export interface LoginResult extends TokenPair {
  expires_at: ISODate;
  user: Omit<User, "created_at" | "updated_at">;
}
export interface RegisterResult extends Pick<
  User,
  "id" | "name" | "email" | "role" | "is_active" | "created_at"
> {
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: ID;
    name: string;
    email: string;
    role: Role;
    createdAt: ISODate;
  };
}
export interface RefreshTokenRequest {
  refreshToken: string;
}
export interface UpdateProfileRequest {
  name?: string;
  phone?: string | null;
}
export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}
export class AuthService {
  constructor(private readonly http: HttpClient) {}
  register(
    body: RegisterRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<RegisterResult>> {
    return this.http.publicPost("/api/v1/auth/register", body, options);
  }
  async login(
    body: LoginRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<LoginResult>> {
    const response = await this.http.publicPost<ApiResponse<LoginResult>>(
      "/api/v1/auth/login",
      body,
      options,
    );
    this.http.setTokens(response.data);
    return response;
  }
  refresh(): Promise<ApiResponse<TokenPair>> {
    return this.http.refreshTokens();
  }
  async logout(options?: RequestOptions): Promise<ApiResponse<SuccessResult>> {
    try {
      return await this.http.post("/api/v1/auth/logout", undefined, options);
    } finally {
      this.http.clearTokens();
    }
  }
  getProfile(
    options?: RequestOptions,
  ): Promise<ApiResponse<User & { user?: User }>> {
    return this.http.get("/api/v1/me", undefined, options);
  }
  updateProfile(
    body: UpdateProfileRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<User>> {
    return this.http.patch("/api/v1/me", body, options);
  }
  async changePassword(
    body: ChangePasswordRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<SuccessResult & { updated_at: ISODate }>> {
    const response = await this.http.put<
      ApiResponse<SuccessResult & { updated_at: ISODate }>
    >("/api/v1/me/password", body, options);
    this.http.clearTokens();
    return response;
  }
}
