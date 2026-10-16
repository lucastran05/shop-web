import type { BackendError, FieldError, JsonValue } from "./common.types";

export type ApiErrorKind =
  "http" | "network" | "timeout" | "aborted" | "protocol" | "session";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly errors: FieldError[] | undefined;
  readonly details: JsonValue | undefined;
  readonly kind: ApiErrorKind;
  readonly payload: unknown;

  constructor(
    message: string,
    options: {
      status?: number;
      kind: ApiErrorKind;
      payload?: unknown;
      backend?: BackendError;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options.cause });
    this.name = "ApiError";
    this.status = options.status ?? 0;
    this.kind = options.kind;
    this.payload = options.payload;
    this.code = options.backend?.code;
    this.errors = options.backend?.errors;
    this.details = options.backend?.details;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
  get isForbidden(): boolean {
    return this.status === 403;
  }
  get isValidationError(): boolean {
    return this.status === 400 || this.status === 422;
  }
  get isServerError(): boolean {
    return this.status >= 500;
  }
}

export function isBackendError(value: unknown): value is BackendError {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    value.status === "error" &&
    "message" in value &&
    typeof value.message === "string"
  );
}
