export function normalizeCatalogPreferences(value) {
  return {
    defaultSort: ["popular", "low", "high"].includes(value?.defaultSort)
      ? value.defaultSort
      : "popular",
    pageSize: [6, 12, 24].includes(value?.pageSize) ? value.pageSize : 6,
  };
}
