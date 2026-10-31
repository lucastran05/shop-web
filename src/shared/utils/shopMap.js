export function getShopMap({ address = "", mapUrl = "" }) {
  let map;
  try {
    map = new URL(mapUrl);
  } catch {
    // An address can provide a map without a configured URL.
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
  const query =
    address?.trim() || (isGoogleMap ? map.searchParams.get("q") : "");
  const embedded =
    isGoogleMap &&
    (map.pathname === "/maps/embed" || map.pathname.startsWith("/maps/embed/"));
  return {
    embedUrl: embedded
      ? map.href
      : query
        ? `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`
        : "",
    openUrl:
      isGoogleMap && (map.pathname !== "/" || map.search)
        ? map.href
        : query
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
          : "",
  };
}
