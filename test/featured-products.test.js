import test from "node:test";
import assert from "node:assert/strict";
import {
  shouldLoadFeatured,
  appendFeaturedProducts,
} from "../src/shared/utils/featuredProducts.js";

test("fetch the next batch only when moving forward will approach the end", () => {
  const row = { scrollLeft: 0, clientWidth: 200, scrollWidth: 1000 };
  assert.equal(shouldLoadFeatured(row, 150), false);
  assert.equal(shouldLoadFeatured({ ...row, scrollLeft: 200 }, 150), false);
  assert.equal(shouldLoadFeatured({ ...row, scrollLeft: 450 }, 150), true);
  assert.equal(shouldLoadFeatured({ ...row, scrollLeft: 800 }, 150), true);
  assert.equal(shouldLoadFeatured({ ...row, clientWidth: 0 }, 150), false);
  assert.equal(
    shouldLoadFeatured(
      { scrollLeft: 0, clientWidth: 800, scrollWidth: 1000 },
      180,
    ),
    true,
  );
});

test("append batches in order without duplicate cards when featured products change between pages", () => {
  const existing = [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
  ];
  assert.deepEqual(
    appendFeaturedProducts(existing, [
      { id: "b", name: "Updated" },
      { id: "c", name: "C" },
    ]),
    [existing[0], { id: "b", name: "Updated" }, { id: "c", name: "C" }],
  );
  assert.equal(existing[1].name, "B");
  assert.deepEqual(appendFeaturedProducts(existing, []), existing);
});
