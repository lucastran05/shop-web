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
