export function getShopMap({ address = "", mapUrl = "" }) {
  const trimmedUrl = String(mapUrl || "").trim();
  const trimmedAddress = String(address || "").trim();
  const isCoord = (str) => /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(str);

  // 1. Tọa độ trực tiếp trong mapUrl
  if (isCoord(trimmedUrl)) {
    return {
      embedUrl: `https://maps.google.com/maps?q=${encodeURIComponent(trimmedUrl)}&output=embed`,
      openUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmedUrl)}`,
    };
  }

  let map;
  try {
    map = new URL(trimmedUrl);
  } catch {
    // Không phải URL hợp lệ
  }

  const isGoogleMap =
    map?.protocol === "https:" &&
    [
      "google.com",
      "www.google.com",
      "maps.google.com",
      "maps.app.goo.gl",
      "google.com.vn",
      "www.google.com.vn",
      "maps.google.com.vn",
      "goo.gl",
    ].includes(map.hostname);

  // 2. Link embed Google Maps trực tiếp
  const isEmbed =
    isGoogleMap &&
    (map.pathname === "/maps/embed" || map.pathname.startsWith("/maps/embed/"));

  if (isEmbed) {
    return {
      embedUrl: map.href,
      openUrl: map.searchParams.get("pb")
        ? `https://www.google.com/maps?q=${encodeURIComponent(trimmedAddress || map.href)}`
        : map.href,
    };
  }

  // 3. Tọa độ từ pathname (/place/.../@10.762622,106.660172)
  const coordInPath = map?.pathname?.match(/@?(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  const coordsFromPath = coordInPath
    ? `${coordInPath[1]},${coordInPath[2]}`
    : null;

  // 4. Tọa độ hoặc query từ search params (?q=... hoặc ?ll=...)
  const queryFromMap = isGoogleMap
    ? map.searchParams.get("q") || map.searchParams.get("ll")
    : null;

  // 5. Tọa độ từ address
  const coordsFromAddress = isCoord(trimmedAddress) ? trimmedAddress : null;

  // Ưu tiên tọa độ và link, không fallback theo tên cửa hàng chung
  let targetQuery = coordsFromPath || queryFromMap || coordsFromAddress;
  if (!targetQuery) {
    if (trimmedAddress && (!trimmedUrl || isGoogleMap)) {
      targetQuery = trimmedAddress;
    }
  }

  if (trimmedUrl && !isGoogleMap && !isCoord(trimmedUrl)) {
    if (!trimmedAddress) {
      return { embedUrl: "", openUrl: "" };
    }
    targetQuery = trimmedAddress;
  }

  const openUrl =
    isGoogleMap && (map.pathname !== "/" || map.search)
      ? map.href
      : targetQuery
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(targetQuery)}`
        : "";

  const embedUrl = targetQuery
    ? `https://maps.google.com/maps?q=${encodeURIComponent(targetQuery)}&output=embed`
    : "";

  return { embedUrl, openUrl };
}
