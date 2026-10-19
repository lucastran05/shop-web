import { expect, test, vi } from "vitest";
import {
  createSessionStore,
  SESSION_STORAGE_KEY,
} from "../../src/services/api/session-store";
import { createApi } from "../../src/services/api/create-api";
import { userError, GENERAL_ERROR } from "../../src/utils/userError";

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
}
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const tokens = {
  accessToken: "access-original",
  refreshToken: "refresh-original",
};

test("login persists only tokens and a new client restores the session after a reload", async () => {
  const storage = memoryStorage();
  const tokenStore = createSessionStore(storage);
  const api = createApi({
    baseURL: "http://localhost:5000",
    tokenStore,
    fetch: vi.fn(async () =>
      json({ status: "success", data: { ...tokens, user: { role: "admin" } } }),
    ),
  });
  await api.auth.login({
    email: "test@example.com",
    password: "test-password",
  });
  expect(JSON.parse(storage.getItem(SESSION_STORAGE_KEY))).toEqual(tokens);
  const fetcher = vi.fn(async (_url, options) => {
    expect(options.headers.get("Authorization")).toBe("Bearer access-original");
    return json({
      status: "success",
      data: { id: "user-id", role: "customer" },
    });
  });
  const restored = createApi({
    baseURL: "http://localhost:5000",
    tokenStore,
    fetch: fetcher,
  });
  expect(restored.http.hasSession()).toBe(true);
  expect((await restored.auth.getProfile()).data.role).toBe("customer");
});

test("rotated tokens replace persisted tokens so a reload does not reuse the old refresh token", async () => {
  const storage = memoryStorage();
  const tokenStore = createSessionStore(storage);
  tokenStore.write(tokens);
  const api = createApi({
    baseURL: "http://localhost:5000",
    tokenStore,
    fetch: vi.fn(async () =>
      json({
        status: "success",
        data: { accessToken: "access-new", refreshToken: "refresh-new" },
      }),
    ),
  });
  await api.auth.refresh();
  expect(createSessionStore(storage).read()).toEqual({
    accessToken: "access-new",
    refreshToken: "refresh-new",
  });
});

test.each([200, 500])(
  "logout removes persisted tokens even when its HTTP status is %i",
  async (status) => {
    const storage = memoryStorage();
    const tokenStore = createSessionStore(storage);
    tokenStore.write(tokens);
    const api = createApi({
      baseURL: "http://localhost:5000",
      tokenStore,
      fetch: vi.fn(async () =>
        status === 200
          ? json({ status: "success", data: { success: true } })
          : json({ status: "error", message: "Database unavailable" }, status),
      ),
    });
    const cleared = vi.fn();
    api.http.onSessionCleared(cleared);
    await api.auth.logout().catch(() => {});
    expect(tokenStore.read()).toBeNull();
    expect(api.http.hasSession()).toBe(false);
    expect(cleared).toHaveBeenCalledOnce();
  },
);

test("a rejected refresh clears the saved session and notifies the UI", async () => {
  const tokenStore = createSessionStore(memoryStorage());
  tokenStore.write(tokens);
  const api = createApi({
    baseURL: "http://localhost:5000",
    tokenStore,
    fetch: vi.fn(async () =>
      json({ status: "error", message: "Revoked refresh token" }, 403),
    ),
  });
  const cleared = vi.fn();
  api.http.onSessionCleared(cleared);
  await expect(api.auth.refresh()).rejects.toMatchObject({ status: 403 });
  expect(tokenStore.read()).toBeNull();
  expect(cleared).toHaveBeenCalledOnce();
});

test("malformed saved state or a saved admin user cannot grant a session", () => {
  const storage = memoryStorage();
  const store = createSessionStore(storage);
  for (const value of [
    "{invalid JSON",
    JSON.stringify({ user: { role: "admin" } }),
    JSON.stringify({ accessToken: "", refreshToken: "token" }),
  ]) {
    storage.setItem(SESSION_STORAGE_KEY, value);
    expect(store.read()).toBeNull();
  }
});

test("blocked storage does not break login in the current tab", async () => {
  const tokenStore = {
    read: () => {
      throw new Error("Blocked");
    },
    write: () => {
      throw new Error("Blocked");
    },
    clear: () => {
      throw new Error("Blocked");
    },
  };
  const api = createApi({
    baseURL: "http://localhost:5000",
    tokenStore,
    fetch: vi.fn(async () => json({ status: "success", data: { ...tokens } })),
  });
  await api.auth.login({
    email: "test@example.com",
    password: "test-password",
  });
  expect(api.http.hasSession()).toBe(true);
});

test("UI error messages never include storage/provider/SQL implementation details", () => {
  for (const error of [
    new Error("MinIO connection refused on port 9000"),
    { status: 503, message: "S3 AccessDenied secret" },
    { status: 500, message: "Postgres SELECT password FROM users" },
    { status: 400, message: "Internal request schema" },
  ]) {
    expect(userError(error)).toBe(GENERAL_ERROR);
  }
  expect(
    userError({ status: 401, message: "JWT verification failed" }),
  ).not.toContain("JWT");
});
