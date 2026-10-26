import type {
  ApiResponse,
  ID,
  ISODate,
  ListResponse,
  PageQuery,
  Person,
} from "./common.types";
import { pathId, type HttpClient, type RequestOptions } from "./http-client";

export type Rating = 1 | 2 | 3 | 4 | 5;
export type UploadPurpose = "review" | "product" | "avatar";
export interface UploadRequest {
  files: readonly File[];
  purpose: UploadPurpose;
}
export interface UploadedFile {
  id: ID;
  url: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
}
export interface Review {
  id: ID;
  product_id: ID;
  author: Person;
  rating: Rating;
  content: string;
  images: { id: ID; url: string }[];
  created_at: ISODate;
}
export interface ReviewRequest {
  rating: Rating;
  content: string;
  image_ids?: ID[];
}
export interface ReviewSummary {
  average_rating: number;
  review_count: number;
}
export interface ReviewEligibility {
  can_review: boolean;
  reason:
    "eligible" | "not_logged_in" | "not_purchased" | "not_delivered" | string;
  message: string;
}
export interface ReviewsResponse extends ListResponse<Review> {
  summary: ReviewSummary;
  user_eligibility?: ReviewEligibility;
}
export interface CreateReviewResponse extends ApiResponse<Review> {
  summary: ReviewSummary;
}

export function uploadForm(body: UploadRequest): FormData {
  if (body.files.length < 1 || body.files.length > 3)
    throw new TypeError("Upload requires 1 to 3 files");
  const form = new FormData();
  const maxSize = (body.purpose === "review" ? 2 : 10) * 1024 * 1024;
  for (const file of body.files) {
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > maxSize
    ) {
      throw new TypeError(
        `Images must be JPEG, PNG or WebP and at most ${maxSize / 1024 / 1024} MB`,
      );
    }
    form.append("files", file, file.name);
  }
  form.append("purpose", body.purpose);
  return form;
}
export class ReviewsService {
  constructor(private readonly http: HttpClient) {}
  list(
    productId: ID,
    query?: PageQuery,
    options?: RequestOptions,
  ): Promise<ReviewsResponse> {
    return this.http.get(
      `/api/v1/products/${pathId(productId)}/reviews`,
      query,
      options,
    );
  }
  checkEligibility(
    productId: ID,
    options?: RequestOptions,
  ): Promise<ApiResponse<ReviewEligibility>> {
    return this.http.get(
      `/api/v1/products/${pathId(productId)}/reviews/eligibility`,
      undefined,
      options,
    );
  }
  create(
    productId: ID,
    body: ReviewRequest,
    options?: RequestOptions,
  ): Promise<CreateReviewResponse> {
    return this.http.post(
      `/api/v1/products/${pathId(productId)}/reviews`,
      body,
      options,
    );
  }
  upload(
    body: UploadRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<UploadedFile[]>> {
    return this.http.post("/api/v1/uploads", uploadForm(body), options);
  }
}
