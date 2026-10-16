import type { ApiResponse, ID, ISODate } from "./common.types";
import type { OrderStatus } from "./orders.service";
import type { HttpClient, RequestOptions } from "./http-client";

export interface DashboardQuery {
  from?: string;
  to?: string;
  timezone?: string;
}
export interface Dashboard {
  revenue: number;
  today_revenue: number;
  order_count: number;
  pending_order_count: number;
  low_stock_count: number;
  low_stock_threshold: number;
  status_counts: { status: OrderStatus; label: string; count: number }[];
  recent_orders: {
    id: ID;
    code: string;
    customer_name: string;
    total_amount: number;
    status: OrderStatus;
    created_at: ISODate;
  }[];
  period: {
    from: ISODate;
    to: ISODate;
    timezone: string;
    revenue_date_basis: string;
  };
}
export interface SalesQuery extends DashboardQuery {
  year?: number;
  group_by?: "day" | "month" | "quarter";
  date_basis?: "completed_at" | "created_at";
}
export interface SalesSummary {
  order_count: number;
  completed_order_count: number;
  revenue: number;
  held_amount: number;
  refunded_amount: number;
}
export interface SalesRow extends SalesSummary {
  period_start: string;
  period_end: string;
  label: string;
}
export interface SalesReport {
  summary: SalesSummary;
  rows: SalesRow[];
  period: {
    from?: string;
    to?: string;
    group_by: "day" | "month" | "quarter";
    timezone: string;
    date_basis: string;
  };
}
export class AdminDashboardReportsService {
  constructor(private readonly http: HttpClient) {}
  dashboard(
    query?: DashboardQuery,
    options?: RequestOptions,
  ): Promise<ApiResponse<Dashboard>> {
    return this.http.get("/admin/dashboard", query, options);
  }
  sales(
    query: SalesQuery = {},
    options?: RequestOptions,
  ): Promise<ApiResponse<SalesReport>> {
    return this.http.get(
      "/admin/reports/sales",
      { ...query, format: "json" },
      options,
    );
  }
  downloadSales(
    query: SalesQuery = {},
    options?: RequestOptions,
  ): Promise<Blob> {
    return this.http.download(
      "/admin/reports/sales",
      { ...query, format: "csv" },
      options,
    );
  }
}
