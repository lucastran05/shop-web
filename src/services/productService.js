import { sampleProducts } from "../constants/products";
// Điểm thay nguồn catalog bằng API khi backend có endpoint sản phẩm.
export const products = sampleProducts.map((p) => ({
  ...p,
  price: Math.min(...p.variants.map((v) => v.price)),
  oldPrice: p.variants[0].oldPrice,
  stock: p.variants.reduce((s, v) => s + v.stock, 0),
}));
export const categories = [...new Set(products.map((p) => p.category))];
export const maxCatalogPrice = Math.max(
  1,
  ...products.flatMap((p) => p.variants.map((v) => v.price)),
);
