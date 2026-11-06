import { ApiError, isBackendError } from "./api-error";
import type { ApiResponse, TokenPair } from "./common.types";

export interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}
export interface IdempotentOptions extends RequestOptions {
  idempotencyKey: string;
}
type Query = object;
interface InternalOptions extends RequestOptions {
  query?: Query;
  body?: unknown;
  headers?: HeadersInit;
  auth?: boolean;
  responseType?: "json" | "blob";
}
export interface HttpClientConfig {
  baseURL: string;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
  tokenStore?: TokenStore;
}
export interface TokenStore {
  read(): TokenPair | null;
  write(tokens: TokenPair): void;
  clear(): void;
}
export type SessionClearReason = "expired" | "manual" | undefined;

/** One instance represents one authenticated session. Persistence is provided by the configured token store. */
export class HttpClient {
  private readonly baseURL: string;
  private readonly timeoutMs: number;
  private readonly fetcher: typeof globalThis.fetch;
  private readonly tokenStore: TokenStore | undefined;
  private readonly sessionListeners = new Set<
    (reason?: SessionClearReason) => void
  >();
  private tokens: TokenPair | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private sessionVersion = 0;
  private refreshFlight: {
    version: number;
    promise: Promise<ApiResponse<TokenPair>>;
  } | null = null;

  constructor(config: HttpClientConfig) {
    const url = new URL(config.baseURL);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    ) {
      throw new TypeError(
        "baseURL must be an HTTP(S) URL without credentials, query or fragment",
      );
    }
    this.baseURL = url.toString().replace(/\/$/, "");
    this.timeoutMs = config.timeoutMs ?? 15000;
    this.fetcher = config.fetch ?? globalThis.fetch.bind(globalThis);
    this.tokenStore = config.tokenStore;
    try {
      this.tokens = this.tokenStore?.read() ?? null;
    } catch {
      this.tokens = null;
    }
    this.scheduleAccessRefresh();
    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0)
      throw new TypeError("Invalid timeoutMs");
  }

  setTokens(tokens: TokenPair): void {
    this.sessionVersion += 1;
    this.tokens = { ...tokens };
    this.persistTokens();
    this.scheduleAccessRefresh();
  }

  clearTokens(reason: SessionClearReason = undefined): void {
    this.sessionVersion += 1;
    this.clearRefreshTimer();
    this.tokens = null;
    this.persistTokens();
    for (const listener of this.sessionListeners) listener(reason);
  }

  hasSession(): boolean {
    return this.tokens !== null;
  }

  getAccessToken(): string | null {
    return this.tokens?.accessToken ?? null;
  }

  onSessionCleared(
    listener: (reason?: SessionClearReason) => void,
  ): () => void {
    this.sessionListeners.add(listener);
    return () => {
      this.sessionListeners.delete(listener);
    };
  }

  private persistTokens(): void {
    try {
      if (this.tokens) this.tokenStore?.write(this.tokens);
      else this.tokenStore?.clear();
    } catch {
      /* The current session still works when browser storage is unavailable. */
    }
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer !== null) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private scheduleAccessRefresh(retryAfterMs?: number): void {
    this.clearRefreshTimer();
    const accessToken = this.tokens?.accessToken;
    if (!accessToken) return;

    let expiresAt = 0;
    try {
      const encodedPayload = accessToken.split(".")[1];
      if (!encodedPayload) return;
      const normalized = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(
        Math.ceil(normalized.length / 4) * 4,
        "=",
      );
      const payload = JSON.parse(atob(padded));
      expiresAt = Number(payload.exp) * 1000;
    } catch {
      return;
    }
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return;

    const delay =
      retryAfterMs ?? Math.max(1000, expiresAt - Date.now() - 60_000);
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      this.refreshTokens().catch((error) => {
        // Network/5xx failures are temporary; retry without logging the user out.
        if (
          this.tokens &&
          !(error instanceof ApiError && [400, 401, 403].includes(error.status))
        ) {
          this.scheduleAccessRefresh(30_000);
        }
      });
    }, delay);
  }

  async refreshTokens(): Promise<ApiResponse<TokenPair>> {
    const version = this.sessionVersion;
    if (this.refreshFlight?.version === version)
      return this.refreshFlight.promise;
    const refreshToken = this.tokens?.refreshToken;
    if (!refreshToken)
      throw new ApiError("No refresh token available", {
        kind: "session",
        status: 401,
      });

    const promise = (async () => {
      try {
        const response = await this.request<ApiResponse<TokenPair>>(
          "POST",
          "/api/v1/auth/refresh-token",
          {
            body: { refreshToken },
            auth: false,
          },
        );
        if (version !== this.sessionVersion)
          throw new ApiError("Session changed during refresh", {
            kind: "session",
          });
        if (
          !response.data ||
          typeof response.data.accessToken !== "string" ||
          typeof response.data.refreshToken !== "string"
        ) {
          throw new ApiError("Invalid refresh response", {
            kind: "protocol",
            payload: response,
          });
        }
        // Keep the session version stable so late 401s can use the rotated token.
        this.tokens = { ...response.data };
        this.persistTokens();
        this.scheduleAccessRefresh();
        return response;
      } catch (error) {
        if (
          version === this.sessionVersion &&
          error instanceof ApiError &&
          [400, 401, 403].includes(error.status)
        ) {
          this.clearTokens("expired");
        }
        throw error;
      } finally {
        if (this.refreshFlight?.version === version) this.refreshFlight = null;
      }
    })();
    this.refreshFlight = { version, promise };
    return promise;
  }

  get<T>(path: string, query?: Query, options?: RequestOptions): Promise<T> {
    return this.request("GET", path, {
      ...options,
      ...(query ? { query } : {}),
    });
  }
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request("POST", path, { ...options, body });
  }
  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request("PATCH", path, { ...options, body });
  }
  put<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    return this.request("PUT", path, { ...options, body });
  }
  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request("DELETE", path, { ...options });
  }
  publicPost<T>(
    path: string,
    body: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request("POST", path, { ...options, body, auth: false });
  }
  idempotentPost<T>(
    path: string,
    body: unknown,
    options: IdempotentOptions,
  ): Promise<T> {
    if (!options.idempotencyKey.trim())
      throw new TypeError("Idempotency-Key is required");
    return this.request("POST", path, {
      ...options,
      body,
      headers: { "Idempotency-Key": options.idempotencyKey },
    });
  }
  download(
    path: string,
    query: Query,
    options?: RequestOptions,
  ): Promise<Blob> {
    return this.request("GET", path, {
      ...options,
      query,
      responseType: "blob",
      headers: { Accept: "text/csv" },
    });
  }

  // Authenticated binary GET (e.g. private images); refreshes the token like other calls.
  getBlob(path: string, query?: Query, options?: RequestOptions): Promise<Blob> {
    return this.request("GET", path, {
      ...options,
      ...(query ? { query } : {}),
      responseType: "blob",
    });
  }

  private async request<T>(
    method: string,
    path: string,
    options: InternalOptions = {},
    retried = false,
  ): Promise<T> {
    if (!path.startsWith("/") || path.startsWith("//"))
      throw new TypeError("Expected an API path");
    const url = new URL(`${this.baseURL}${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined && value !== null)
        url.searchParams.set(key, String(value));
    }
    const version = this.sessionVersion;
    const token = options.auth === false ? undefined : this.tokens?.accessToken;
    const headers = new Headers(options.headers);
    if (!headers.has("Accept")) headers.set("Accept", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const isForm = options.body instanceof FormData;
    if (options.body !== undefined && !isForm)
      headers.set("Content-Type", "application/json");
    const body =
      options.body === undefined
        ? undefined
        : isForm
          ? (options.body as FormData)
          : JSON.stringify(options.body);
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0)
      throw new TypeError("Invalid timeoutMs");
    let timedOut = false;
    const abort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener("abort", abort, { once: true });
    if (options.signal?.aborted) abort();
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    let response: Response;
    let payload: unknown;
    try {
      response = await this.fetcher(url, {
        method,
        headers,
        signal: controller.signal,
        ...(body === undefined ? {} : { body }),
      });
      if (response.ok && options.responseType === "blob") {
        return (await response.blob()) as T;
      }
      const raw = await response.text();
      if (raw) {
        try {
          payload = JSON.parse(raw) as unknown;
        } catch {
          if (response.ok)
            throw new ApiError("API returned invalid JSON", {
              kind: "protocol",
              status: response.status,
              payload: raw,
            });
          payload = raw;
        }
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        timedOut
          ? "API request timed out"
          : options.signal?.aborted
            ? "API request cancelled"
            : "Unable to connect to API",
        {
          kind: timedOut
            ? "timeout"
            : options.signal?.aborted
              ? "aborted"
              : "network",
          cause: error,
        },
      );
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
    }

    if (
      response.status === 401 &&
      token &&
      !retried &&
      version === this.sessionVersion &&
      this.tokens?.refreshToken
    ) {
      if (token === this.tokens.accessToken) await this.refreshTokens();
      if (version !== this.sessionVersion)
        throw new ApiError("Session changed during request", {
          kind: "session",
          status: 401,
        });
      options.signal?.throwIfAborted();
      return this.request<T>(method, path, options, true);
    }
    if (!response.ok || isBackendError(payload)) {
      if (
        response.status === 401 &&
        token &&
        version === this.sessionVersion &&
        token === this.tokens?.accessToken
      )
        this.clearTokens("expired");
      const backend = isBackendError(payload) ? payload : undefined;
      throw new ApiError(
        backend?.message ?? `HTTP ${response.status}: ${response.statusText}`,
        {
          kind: "http",
          status: response.status,
          payload,
          ...(backend ? { backend } : {}),
        },
      );
    }
    if (response.status === 204) return undefined as T;
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("status" in payload) ||
      payload.status !== "success"
    ) {
      throw new ApiError("API returned an invalid success envelope", {
        kind: "protocol",
        status: response.status,
        payload,
      });
    }
    return payload as T;
  }
}

export const pathId = (id: string): string => {
  if (!id.trim()) throw new TypeError("Resource ID is required");
  return encodeURIComponent(id);
};
