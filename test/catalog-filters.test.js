import test from "node:test";
import assert from "node:assert/strict";
import {
  getCatalogFilters,
  filterCatalogProducts,
} from "../src/shared/utils/search.js";

const products = [
  {
    id: 1,
    name: "Đèn hoa tím",
    category: "Đèn",
    price: 100000,
    stock: 2,
    featured: false,
  },
  {
    id: 2,
    name: "Đèn hoa trắng",
    category: "Đèn",
    price: 200000,
    stock: 0,
    featured: true,
  },
  {
    id: 3,
    name: "Bình hoa tím",
    category: "Bình",
    price: 300000,
    stock: 4,
    featured: true,
  },
];
const filters = (query) => getCatalogFilters(new URLSearchParams(query));
const ids = (query) =>
  filterCatalogProducts(products, filters(query)).map((p) => p.id);

test("catalog price range is optional and capped at 100 million independently of products", () => {
  assert.deepEqual(filters("").price, [0, 100000000]);
  assert.deepEqual(
    filters("min_price=-10&max_price=999999").price,
    [0, 999999],
  );
  assert.deepEqual(
    filters("min_price=invalid&max_price=Infinity").price,
    [0, 100000000],
  );
  assert.deepEqual(
    filters("min_price=200000&max_price=100000").price,
    [100000, 100000],
  );
  assert.deepEqual(filters("max_price=0").price, [0, 0]);
  assert.deepEqual(
    filters("min_price=500000&max_price=2000000").price,
    [500000, 2000000],
  );
  assert.deepEqual(
    filters("min_price=200000000&max_price=300000000").price,
    [100000000, 100000000],
  );
  assert.deepEqual(ids("min_price=500000"), []);
  assert.equal(filters("sort=invalid").sort, "popular");
});

test("one search combines with category, price, stock and featured filters", () => {
  assert.deepEqual(
    ids(
      "search=hoa+tim&category=Đèn&min_price=100000&max_price=200000&in_stock=true",
    ),
    [1],
  );
  assert.deepEqual(ids("search=hoa&in_stock=true&featured=true"), [3]);
  assert.deepEqual(ids("q=den"), [2, 1]);
  assert.deepEqual(ids("search=binh&q=den"), [3]);
  assert.deepEqual(ids("category=Unknown"), []);
  assert.deepEqual(ids("min_price=100001&max_price=199999"), []);
});

test("price sorting respects actual prices regardless of featured flags without mutating products", () => {
  assert.deepEqual(ids("sort=low"), [1, 2, 3]);
  assert.deepEqual(ids("sort=high"), [3, 2, 1]);
  assert.deepEqual(ids(""), [2, 3, 1]);
  assert.deepEqual(
    products.map((p) => p.id),
    [1, 2, 3],
  );
});

test("category counts use the other active filters rather than unfiltered backend totals", () => {
  const active = filters("search=hoa&in_stock=true&category=Đèn");
  const candidates = filterCatalogProducts(products, {
    ...active,
    category: "",
  });
  assert.equal(candidates.filter((p) => p.category === "Đèn").length, 1);
  assert.equal(candidates.filter((p) => p.category === "Bình").length, 1);
  assert.equal(candidates.length, 2);
});
