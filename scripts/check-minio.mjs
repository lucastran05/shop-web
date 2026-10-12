import { createServer } from "node:http";
import { once } from "node:events";
import assert from "node:assert/strict";
import {
  productImageMiddleware,
  storageClient,
  bucket,
} from "../server/productStorage.js";

const middleware = productImageMiddleware(process.cwd());
const server = createServer((req, res) =>
  middleware(req, res, () => {
    res.writeHead(404);
    res.end();
  }),
);
server.listen(0, "127.0.0.1");
await once(server, "listening");
const base = `http://127.0.0.1:${server.address().port}`;
const bytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
  "base64",
);
let key;
try {
  const headers = {
    "Content-Type": "image/png",
    "X-Shop-Upload": "1",
    Origin: base,
  };
  const upload = await fetch(`${base}/api/product-images`, {
    method: "POST",
    headers,
    body: bytes,
  });
  assert.equal(upload.status, 201, await upload.clone().text());
  const { url } = await upload.json();
  key = url.split("/").at(-1);
  const download = await fetch(`${base}${url}`);
  assert.equal(download.status, 200);
  assert.equal(download.headers.get("content-type"), "image/png");
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), bytes);
  const forged = await fetch(`${base}/api/product-images`, {
    method: "POST",
    headers,
    body: "not an image",
  });
  assert.equal(forged.status, 415);
  const crossOrigin = await fetch(`${base}/api/product-images`, {
    method: "POST",
    headers: { ...headers, Origin: "https://example.org" },
    body: bytes,
  });
  assert.equal(crossOrigin.status, 403);
  const missingHeader = await fetch(`${base}/api/product-images`, {
    method: "POST",
    headers: { "Content-Type": "image/png" },
    body: bytes,
  });
  assert.equal(missingHeader.status, 403);
  console.log(
    "MinIO check passed: upload, download byte match, invalid image rejection, origin and request checks.",
  );
} finally {
  if (key) await (await storageClient(process.cwd())).removeObject(bucket, key);
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
