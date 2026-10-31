import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCatalogPreferences } from "../src/shared/preferences/catalogPreferences.js";
import { getCatalogFilters } from "../src/shared/utils/search.js";

test("saved shopping preferences accept supported choices and reject invalid storage values", () => {
  assert.deepEqual(
    normalizeCatalogPreferences({ defaultSort: "high", pageSize: 24 }),
    { defaultSort: "high", pageSize: 24 },
  );
  for (const value of [
    null,
    [],
    false,
    "wrong",
    { defaultSort: "invalid", pageSize: -1 },
  ]) {
    assert.deepEqual(normalizeCatalogPreferences(value), {
      defaultSort: "popular",
      pageSize: 6,
    });
  }
  assert.deepEqual(
    normalizeCatalogPreferences({ defaultSort: "low", pageSize: "12" }),
    { defaultSort: "low", pageSize: 6 },
  );
});

test("catalog uses preferred sorting unless the URL explicitly selects another sort", () => {
  assert.equal(getCatalogFilters(new URLSearchParams(), "low").sort, "low");
  assert.equal(
    getCatalogFilters(new URLSearchParams("sort=high"), "low").sort,
    "high",
  );
  assert.equal(
    getCatalogFilters(new URLSearchParams("sort=popular"), "low").sort,
    "popular",
  );
});
