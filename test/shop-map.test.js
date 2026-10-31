import test from "node:test";
import assert from "node:assert/strict";
import { getShopMap } from "../src/shared/utils/shopMap.js";

test("an address generates an embedded map and useful link instead of the generic Maps homepage", () => {
  const address = "12 Nguyễn Trãi, Hà Nội";
  const map = getShopMap({ address, mapUrl: "https://maps.google.com" });
  assert.equal(new URL(map.embedUrl).searchParams.get("q"), address);
  assert.equal(new URL(map.embedUrl).searchParams.get("output"), "embed");
  assert.equal(new URL(map.openUrl).searchParams.get("query"), address);
});

test("configured Google embed and place links are preserved", () => {
  const embedUrl = "https://www.google.com/maps/embed?pb=test";
  assert.equal(getShopMap({ mapUrl: embedUrl }).embedUrl, embedUrl);
  const shortUrl = "https://maps.app.goo.gl/example";
  const map = getShopMap({ address: "Hà Nội", mapUrl: shortUrl });
  assert.equal(map.openUrl, shortUrl);
  assert.ok(map.embedUrl);
  assert.equal(getShopMap({ mapUrl: shortUrl }).embedUrl, "");
});

test("missing locations and unsafe or unrelated iframe URLs do not produce an arbitrary embed", () => {
  assert.deepEqual(getShopMap({}), { embedUrl: "", openUrl: "" });
  for (const mapUrl of [
    "javascript:alert(1)",
    "https://www.google.com.evil.test/maps/embed?pb=test",
    "https://example.com/maps/embed",
    "invalid",
  ]) {
    assert.deepEqual(getShopMap({ mapUrl }), { embedUrl: "", openUrl: "" });
    assert.equal(
      new URL(getShopMap({ mapUrl, address: "Hà Nội" }).embedUrl).hostname,
      "maps.google.com",
    );
  }
});
