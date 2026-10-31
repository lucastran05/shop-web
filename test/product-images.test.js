import test from "node:test";
import assert from "node:assert/strict";
import { getVariantImages } from "../src/shared/adapters/productAdapter.js";

test("product images follow variant order without duplicates or placeholders", () => {
  const variants = [
    { image: "" },
    { image: "/product-placeholder.svg" },
    { image: "/red.webp" },
    { image: "/blue.webp" },
    { image: "/red.webp" },
    {},
  ];
  assert.deepEqual(getVariantImages(variants), ["/red.webp", "/blue.webp"]);
  assert.equal(variants[3].image, "/blue.webp");
});

test("products without variant images keep an empty gallery", () => {
  assert.deepEqual(getVariantImages([]), []);
  assert.deepEqual(
    getVariantImages([{}, { image: "/product-placeholder.svg" }]),
    [],
  );
});
