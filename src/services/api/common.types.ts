export type ID = string;
export type ISODate = string;
export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export interface ApiResponse<T> {
  status: "success";
  message?: string;
  data: T;
}
export interface MessageResponse {
  status: "success";
  message?: string;
}
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}
export interface PageQuery {
  page?: number;
  limit?: number;
}
export interface KeywordQuery extends PageQuery {
  keyword?: string;
}
export interface ListResponse<T> extends ApiResponse<T[]> {
  pagination: Pagination;
}
export interface CursorQuery {
  cursor?: string;
  after_id?: ID;
  limit?: number;
}
export interface CursorPagination {
  next_cursor: string | null;
  has_more: boolean;
}
export interface FieldError {
  field: string;
  message: string;
}
export interface BackendError {
  status: "error";
  message: string;
  code?: string;
  errors?: FieldError[];
  details?: JsonValue;
}
export interface DeletedResult {
  deleted_id: ID;
}
export interface BulkDeleteRequest {
  ids: ID[];
}
export interface BulkDeleteResult {
  deleted_ids: ID[];
  failed: { id: ID; code: string; message: string }[];
}
export interface Person {
  id: ID;
  name: string;
}
export interface Customer extends Person {
  email: string;
}
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
export interface SuccessResult {
  success: true;
}
