export async function uploadProductImage(blob) {
  const response = await fetch("/api/product-images", {
    method: "POST",
    headers: { "Content-Type": blob.type, "X-Shop-Upload": "1" },
    body: blob,
    signal: AbortSignal.timeout(30000),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Không tải được ảnh lên MinIO.");
  return result.url;
}
