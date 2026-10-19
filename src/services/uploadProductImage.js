export async function uploadProductImage(blob) {
  const response = await fetch("/api/product-images", {
    method: "POST",
    headers: { "Content-Type": blob.type, "X-Shop-Upload": "1" },
    body: blob,
    signal: AbortSignal.timeout(30000),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error("Không tải được ảnh. Vui lòng thử lại sau.");
  return result.url;
}
