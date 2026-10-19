import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { Client } from "minio";

export const bucket = "shop-products";
export const maxImageSize = 10 * 1024 * 1024;
const types = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function storageClient(root) {
  const raw = await readFile(resolve(root, ".minio/credentials.json"), "utf8");
  const credentials = JSON.parse(raw.replace(/^\uFEFF/, ""));
  return new Client({
    endPoint: "127.0.0.1",
    port: 9000,
    useSSL: false,
    accessKey: credentials.MINIO_ROOT_USER,
    secretKey: credentials.MINIO_ROOT_PASSWORD,
    region: "us-east-1",
  });
}

export function validImage(bytes, type) {
  if (type === "image/png")
    return bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (type === "image/jpeg")
    return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (type === "image/webp")
    return (
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP"
    );
  return false;
}

export function productImageMiddleware(root) {
  function json(res, status, data) {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
    });
    res.end(JSON.stringify(data));
  }
  return async (req, res, next) => {
    // Block runtime files before Vite's static serving and SPA fallback.
    try {
      if (
        decodeURIComponent(req.url || "")
          .replaceAll("\\", "/")
          .toLowerCase()
          .split(/[/?]/)
          .includes(".minio")
      ) {
        return json(res, 403, { error: "Forbidden" });
      }
    } catch {
      return json(res, 400, { error: "Invalid URL" });
    }
    const path = req.url?.split("?")[0];
    if (
      path !== "/api/product-images" &&
      !path?.startsWith("/api/product-images/")
    )
      return next();
    // Local development API: the current app has no server-side staff authentication.
    if (
      !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
        req.socket.remoteAddress,
      )
    )
      return json(res, 403, { error: "API tải ảnh chỉ dùng trên máy local." });
    if (
      req.headers.origin &&
      req.headers.origin !== `http://${req.headers.host}`
    )
      return json(res, 403, { error: "Origin không hợp lệ." });
    try {
      if (req.method === "POST" && path === "/api/product-images") {
        if (req.headers["x-shop-upload"] !== "1")
          return json(res, 403, { error: "Yêu cầu tải ảnh không hợp lệ." });
        const type = req.headers["content-type"];
        if (!types[type])
          return json(res, 415, {
            error: "Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.",
          });
        if (Number(req.headers["content-length"]) > maxImageSize)
          return json(res, 413, { error: "Ảnh không được vượt quá 10 MB." });
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > maxImageSize) {
            json(res, 413, { error: "Ảnh không được vượt quá 10 MB." });
            return;
          }
          chunks.push(chunk);
        }
        const bytes = Buffer.concat(chunks);
        if (!validImage(bytes, type))
          return json(res, 415, {
            error: "Nội dung tệp không phải ảnh hợp lệ.",
          });
        const client = await storageClient(root);
        if (!(await client.bucketExists(bucket))) {
          try {
            await client.makeBucket(bucket, "us-east-1");
          } catch (error) {
            if (error.code !== "BucketAlreadyOwnedByYou") throw error;
          }
        }
        const key = `${randomUUID()}.${types[type]}`;
        await client.putObject(bucket, key, bytes, bytes.length, {
          "Content-Type": type,
        });
        return json(res, 201, { url: `/api/product-images/${key}` });
      }
      if (req.method === "GET" || req.method === "HEAD") {
        const key = path.slice("/api/product-images/".length);
        if (!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(key))
          return json(res, 404, { error: "Không tìm thấy ảnh." });
        const client = await storageClient(root);
        const stat = await client.statObject(bucket, key);
        const type = Object.entries(types).find(([, ext]) =>
          key.endsWith(`.${ext}`),
        )[0];
        res.writeHead(200, {
          "Content-Type": type,
          "Content-Length": stat.size,
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Content-Type-Options": "nosniff",
        });
        if (req.method === "HEAD") return res.end();
        const stream = await client.getObject(bucket, key);
        stream.on("error", () => res.destroy());
        res.on("close", () => stream.destroy());
        return stream.pipe(res);
      }
      res.setHeader("Allow", "GET, HEAD, POST");
      return json(res, 405, { error: "Phương thức không hỗ trợ." });
    } catch (error) {
      if (res.headersSent) return res.destroy();
      if (["NoSuchKey", "NoSuchBucket", "NotFound"].includes(error.code))
        return json(res, 404, { error: "Không tìm thấy ảnh." });
      return json(res, 503, {
        error: "Không thể xử lý ảnh lúc này. Vui lòng thử lại sau.",
      });
    }
  };
}

export function minioStoragePlugin() {
  return {
    name: "local-minio-product-images",
    configureServer(server) {
      server.middlewares.use(productImageMiddleware(server.config.root));
    },
    configurePreviewServer(server) {
      server.middlewares.use(productImageMiddleware(server.config.root));
    },
  };
}
