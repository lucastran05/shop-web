import test from "node:test";
import assert from "node:assert/strict";
import { mergeMessages } from "../src/shared/utils/mergeMessages.js";

test("history loaded after a socket message preserves that message, order and read state", () => {
  const old = {
    id: "old",
    createdAt: "2026-10-29T10:00:00Z",
    text: "Cũ",
    is_read: true,
  };
  const live = {
    id: "live",
    createdAt: "2026-10-30T10:00:00Z",
    text: "Tiếng Việt 🌿",
  };
  const withLive = mergeMessages([old], [live]);
  const afterHistory = mergeMessages(withLive, [{ ...old, is_read: false }]);
  assert.deepEqual(
    afterHistory.map((item) => item.id),
    ["old", "live"],
  );
  assert.equal(afterHistory[0].is_read, true);
  assert.equal(afterHistory[1].text, live.text);
  assert.equal(mergeMessages(afterHistory, [live]).length, 2);
});

test('deleted messages do not return from late history responses or socket events', () => {
  const removed = { id: 'deleted', createdAt: '2026-10-30T10:00:00Z', text: 'Removed' };
  const kept = { id: 'kept', createdAt: '2026-10-30T11:00:00Z', text: 'Other conversation' };
  const deleted = new Set([removed.id]);
  assert.deepEqual(mergeMessages([removed, kept], [removed], deleted), [{ ...kept }]);
  assert.deepEqual(mergeMessages([], [removed], deleted), []);
});
