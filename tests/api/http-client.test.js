import { createServer } from "node:http";
import { once } from "node:events";
import { afterAll, beforeAll, expect, test } from "vitest";
import { HttpClient } from "../../src/services/api/http-client";
import { createApi } from "../../src/services/api/create-api";
import { ApiError } from "../../src/services/api/api-error";

// These transport fixtures run only in tests. Production services always use HTTP.
let server;
let baseURL;
let handle;
beforeAll(async () => {
  server = createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (error) {
      res.writeHead(500);
      res.end(String(error));
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseURL = `http://127.0.0.1:${server.address().port}`;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});
const send = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};
const success = (res, data, status = 200) =>
  send(res, status, { status: "success", data });
const readBody = async (req) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  return body;
};

test("serializes zero/false and Unicode query values, preserves response metadata and 201", async () => {
  const api = createApi({ baseURL });
  handle = (req, res) => {
    const url = new URL(req.url, baseURL);
    expect(url.searchParams.get("keyword")).toBe("bàn phím & chuột");
    expect(url.searchParams.get("min_price")).toBe("0");
    expect(url.searchParams.get("in_stock")).toBe("false");
    expect(url.searchParams.has("max_price")).toBe(false);
    send(res, 200, {
      status: "success",
      data: [],
      filters: { min_price: 0, max_price: 10 },
      pagination: { page: 1, limit: 12, total: 0, total_pages: 0 },
    });
  };
  const result = await api.products.list({
    keyword: "bàn phím & chuột",
    min_price: 0,
    in_stock: false,
  });
  expect(result.filters.min_price).toBe(0);
  expect(result.pagination.limit).toBe(12);
  handle = async (req, res) => {
    expect(req.method).toBe("POST");
    expect(JSON.parse(await readBody(req))).toEqual({ name: "Gear" });
    success(res, { id: "category-id" }, 201);
  };
  expect((await api.adminCategories.create({ name: "Gear" })).data.id).toBe(
    "category-id",
  );
});

test.each([400, 401, 403, 404, 409, 422, 429, 500])(
  "preserves backend error at HTTP %i",
  async (status) => {
    const body = {
      status: "error",
      message: "Backend error",
      code: "BACKEND_CODE",
      errors: [{ field: "email", message: "Invalid" }],
      details: { request_id: "trace" },
    };
    handle = (_req, res) => send(res, status, body);
    const error = await new HttpClient({ baseURL })
      .get("/error")
      .catch((caught) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status,
      code: "BACKEND_CODE",
      errors: body.errors,
      details: body.details,
      payload: body,
    });
  },
);

test("handles backend errors without code and non-JSON gateway errors", async () => {
  const http = new HttpClient({ baseURL });
  handle = (_req, res) =>
    send(res, 403, { status: "error", message: "Account locked" });
  await expect(http.get("/error")).rejects.toMatchObject({
    status: 403,
    code: undefined,
    message: "Account locked",
  });
  handle = (_req, res) => {
    res.writeHead(500);
    res.end("<html>upstream failed</html>");
  };
  await expect(http.get("/error")).rejects.toMatchObject({
    kind: "http",
    status: 500,
  });
  handle = (_req, res) => {
    res.writeHead(200);
    res.end("invalid JSON");
  };
  await expect(http.get("/error")).rejects.toMatchObject({
    kind: "protocol",
    status: 200,
  });
});

test("shares one rotating refresh for concurrent 401s including a late stale 401", async () => {
  const http = new HttpClient({ baseURL });
  http.setTokens({ accessToken: "old", refreshToken: "refresh-old" });
  let refreshCount = 0;
  let oldRequests = 0;
  let releaseLate;
  handle = async (req, res) => {
    if (req.url === "/api/v1/auth/refresh-token") {
      refreshCount++;
      expect(JSON.parse(await readBody(req))).toEqual({
        refreshToken: "refresh-old",
      });
      expect(req.headers.authorization).toBeUndefined();
      success(res, { accessToken: "new", refreshToken: "refresh-new" });
      return;
    }
    if (req.headers.authorization === "Bearer old") {
      oldRequests++;
      if (oldRequests === 3) {
        releaseLate = () =>
          send(res, 401, { status: "error", message: "expired" });
        return;
      }
      // Wait until all original requests reached the server before sending 401s.
      while (oldRequests < 3)
        await new Promise((resolve) => setTimeout(resolve, 1));
      send(res, 401, { status: "error", message: "expired" });
      return;
    }
    expect(req.headers.authorization).toBe("Bearer new");
    success(res, { authorized: true });
    const release = releaseLate;
    releaseLate = undefined;
    release?.();
  };
  const results = await Promise.all([
    http.get("/one"),
    http.get("/two"),
    http.get("/three"),
  ]);
  expect(refreshCount).toBe(1);
  expect(results.every((result) => result.data.authorized)).toBe(true);
});

test("does not resurrect a session cleared during refresh", async () => {
  const http = new HttpClient({ baseURL });
  http.setTokens({ accessToken: "old", refreshToken: "refresh" });
  let release;
  const arrived = new Promise((resolve) => {
    handle = (_req, res) => {
      release = () =>
        success(res, { accessToken: "new", refreshToken: "new-refresh" });
      resolve();
    };
  });
  const outcome = http.refreshTokens().catch((error) => error);
  await arrived;
  http.clearTokens();
  release();
  expect(await outcome).toMatchObject({ kind: "session" });
  handle = (req, res) => {
    expect(req.headers.authorization).toBeUndefined();
    success(res, null);
  };
  await http.get("/after-logout");
});

test("refresh rejection clears tokens and retries each protected request at most once", async () => {
  const http = new HttpClient({ baseURL });
  http.setTokens({ accessToken: "expired", refreshToken: "revoked" });
  let count = 0;
  handle = (req, res) => {
    count++;
    send(res, req.url.includes("refresh-token") ? 403 : 401, {
      status: "error",
      message: "Denied",
    });
  };
  await expect(http.get("/private")).rejects.toMatchObject({ status: 403 });
  expect(count).toBe(2);
  handle = (req, res) => {
    expect(req.headers.authorization).toBeUndefined();
    success(res, null);
  };
  await http.get("/public");
});

test("sends a stable idempotency key and never retries server failures", async () => {
  const api = createApi({ baseURL });
  let count = 0;
  handle = async (req, res) => {
    count++;
    expect(req.url).toBe("/api/v1/orders");
    expect(req.headers["idempotency-key"]).toBe("operation-key");
    expect(JSON.parse(await readBody(req))).toEqual({ quote_id: "quote-id" });
    send(res, 500, { status: "error", message: "Transaction failed" });
  };
  await expect(
    api.checkout.createOrder(
      { quote_id: "quote-id" },
      { idempotencyKey: "operation-key" },
    ),
  ).rejects.toMatchObject({ status: 500 });
  expect(count).toBe(1);
});

test("streams actual multipart with a browser-generated boundary and CSV as Blob", async () => {
  const api = createApi({ baseURL });
  handle = async (req, res) => {
    expect(req.headers["content-type"]).toMatch(
      /^multipart\/form-data; boundary=/,
    );
    const body = await readBody(req);
    expect(body).toContain('name="files"; filename="review.png"');
    expect(body).toContain('name="purpose"');
    expect(body).toContain("image-bytes");
    success(res, [], 201);
  };
  await api.reviews.upload({
    files: [new File(["image-bytes"], "review.png", { type: "image/png" })],
    purpose: "review",
  });
  handle = (req, res) => {
    expect(req.url).toContain("format=csv");
    res.writeHead(200, { "Content-Type": "text/csv" });
    res.end("revenue\n100\n");
  };
  expect(await (await api.adminDashboardReports.downloadSales()).text()).toBe(
    "revenue\n100\n",
  );
  handle = (_req, res) =>
    send(res, 403, { status: "error", message: "Forbidden CSV" });
  await expect(api.adminDashboardReports.downloadSales()).rejects.toMatchObject(
    { status: 403, message: "Forbidden CSV" },
  );
});

test("distinguishes timeout, cancellation, empty success and network failure", async () => {
  const http = new HttpClient({ baseURL });
  handle = () => {};
  await expect(
    http.get("/slow", undefined, { timeoutMs: 25 }),
  ).rejects.toMatchObject({ kind: "timeout" });
  const controller = new AbortController();
  const request = http.get("/cancel", undefined, { signal: controller.signal });
  controller.abort();
  await expect(request).rejects.toMatchObject({ kind: "aborted" });
  handle = (_req, res) => {
    res.writeHead(204);
    res.end();
  };
  expect(await http.delete("/empty")).toBeUndefined();
  handle = (req) => req.socket.destroy();
  await expect(http.get("/disconnect")).rejects.toMatchObject({
    kind: "network",
  });
});
