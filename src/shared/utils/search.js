export function normalizeSearch(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();
}
export function matchesProduct(product, query, includeDescription = false) {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  const haystack = normalizeSearch(
    [product.name, includeDescription ? product.description : ""].join(" "),
  );
  return terms.every((term) => haystack.includes(term));
}

export const MAX_FILTER_PRICE = 100_000_000;

export function getCatalogFilters(params, defaultSort = "popular") {
  function price(key, fallback) {
    const raw = params.get(key);
    const value = Number(raw);
    return raw?.trim() && Number.isFinite(value)
      ? Math.min(MAX_FILTER_PRICE, Math.max(0, value))
      : fallback;
  }
  const max = price("max_price", MAX_FILTER_PRICE);
  const sort = params.get("sort") || defaultSort;
  return {
    query: params.get("search") || params.get("q") || "",
    category: params.get("category") || "",
    price: [Math.min(price("min_price", 0), max), max],
    stock: params.get("in_stock") === "true",
    featured: params.get("featured") === "true",
    sort: ["popular", "low", "high"].includes(sort) ? sort : "popular",
  };
}

export function filterCatalogProducts(products, filters, user = null) {
  return products
    .filter((p) => {
      if (p.visibility === "hidden") return false;
      if (p.visibility === "private" && !user) return false;
      return (
        (!filters.category ||
          filters.category === "Tất cả" ||
          p.category === filters.category) &&
        matchesProduct(p, filters.query, true) &&
        p.price >= filters.price[0] &&
        p.price <= filters.price[1] &&
        (!filters.stock || p.stock > 0) &&
        (!filters.featured || p.featured)
      );
    })
    .sort((a, b) =>
      filters.sort === "low"
        ? a.price - b.price
        : filters.sort === "high"
          ? b.price - a.price
          : Number(Boolean(b.featured)) - Number(Boolean(a.featured)),
    );
}
