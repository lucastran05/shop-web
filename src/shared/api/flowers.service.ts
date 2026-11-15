import type {
  ApiResponse,
  ID,
  ISODate,
  ListResponse,
  MessageResponse,
  PageQuery,
} from "./common.types";
import type { HttpClient, RequestOptions } from "./http-client";
export interface FlowerCandidate {
  scientificName: string;
  commonNames: string[];
  family: string;
  score: number;
  // Filled from Wikipedia for the best match only; empty when not found.
  vietnameseName?: string;
  description?: { vi: string; en: string };
}
// One saved identification: the best match plus every candidate returned.
export interface FlowerHistoryRecord extends FlowerCandidate {
  id: ID;
  vietnameseName: string;
  description: { vi: string; en: string };
  candidates: FlowerCandidate[];
  hasImage: boolean;
  createdAt: ISODate;
}
export class FlowersService {
  constructor(private readonly http: HttpClient) {}
  identify(
    image: File,
    options?: RequestOptions & { lang?: "vi" | "en" },
  ): Promise<
    ApiResponse<{ candidates: FlowerCandidate[]; historyId: ID | null }>
  > {
    const form = new FormData();
    form.append("image", image);
    const lang = options?.lang === "en" ? "en" : "vi";
    return this.http.post(`/api/v1/flowers/identify?lang=${lang}`, form, {
      timeoutMs: 30000,
      ...options,
    });
  }
  history(
    query?: PageQuery,
    options?: RequestOptions,
  ): Promise<ListResponse<FlowerHistoryRecord>> {
    return this.http.get("/api/v1/flowers/history", query, options);
  }
  historyItem(
    id: ID,
    options?: RequestOptions,
  ): Promise<ApiResponse<FlowerHistoryRecord>> {
    return this.http.get(
      `/api/v1/flowers/history/${encodeURIComponent(id)}`,
      undefined,
      options,
    );
  }
  // Private photo of a history entry; needs the bearer token, so it is fetched as a Blob.
  historyImage(id: ID, options?: RequestOptions): Promise<Blob> {
    return this.http.getBlob(
      `/api/v1/flowers/history/${encodeURIComponent(id)}/image`,
      undefined,
      options,
    );
  }
  deleteHistoryItem(id: ID, options?: RequestOptions): Promise<MessageResponse> {
    return this.http.delete(
      `/api/v1/flowers/history/${encodeURIComponent(id)}`,
      options,
    );
  }
  clearHistory(
    options?: RequestOptions,
  ): Promise<ApiResponse<{ deleted: number }>> {
    return this.http.delete("/api/v1/flowers/history", options);
  }
}
