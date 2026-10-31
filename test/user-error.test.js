import test from "node:test";
import assert from "node:assert/strict";
import { GENERAL_ERROR, userError } from "../src/shared/utils/userError.js";

test("connection failures and unavailable backend responses give a retryable connection message", () => {
  const expected = userError({ kind: "network" });
  assert.notEqual(expected, GENERAL_ERROR);
  for (const status of [502, 503, 504])
    assert.equal(userError({ status }), expected);
  assert.notEqual(userError({ kind: "timeout" }), GENERAL_ERROR);
});

test("authentication messages are preserved and internal errors remain private", () => {
  assert.match(userError({ status: 401 }), /401|đăng nhập/);
  assert.notEqual(userError({ status: 403 }), GENERAL_ERROR);
  assert.equal(
    userError({ status: 500, message: "secret database details" }),
    GENERAL_ERROR,
  );
  assert.equal(userError(new Error("internal error")), GENERAL_ERROR);
  assert.equal(userError(null), GENERAL_ERROR);
});
