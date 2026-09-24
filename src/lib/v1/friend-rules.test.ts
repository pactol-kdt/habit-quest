import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateUid } from "./generate-uid.ts";
import {
  buildNudgeCopy,
  formatUid,
  normalizeUid,
  nudgeAvailability,
  orderUserPair,
} from "./friend-rules.ts";

describe("UID", () => {
  it("normalizes a typed UID", () => {
    assert.equal(normalizeUid("k7m4-pq2r"), "K7M4PQ2R");
    assert.equal(normalizeUid("  k7m4 pq2r "), "K7M4PQ2R");
    assert.equal(normalizeUid("K7M4PQ2"), null);
    assert.equal(normalizeUid("K7M4PQ2I"), null);
  });

  it("formats and generates an 8-character UID", () => {
    const uid = generateUid();
    assert.equal(uid.length, 8);
    assert.equal(normalizeUid(uid), uid);
    assert.equal(formatUid(uid), `${uid.slice(0, 4)}-${uid.slice(4)}`);
  });
});

describe("friend pairs and nudges", () => {
  it("orders a pair the same either way", () => {
    assert.deepEqual(orderUserPair("b", "a"), { low: "a", high: "b" });
    assert.deepEqual(orderUserPair("a", "b"), { low: "a", high: "b" });
  });

  it("hides the nudge once the day is clear, already sent, or push is off", () => {
    assert.equal(nudgeAvailability({ done: 4, due: 4, alreadyNudged: false, hasPush: true }), "done");
    assert.equal(nudgeAvailability({ done: 0, due: 0, alreadyNudged: false, hasPush: true }), "done");
    assert.equal(nudgeAvailability({ done: 1, due: 4, alreadyNudged: true, hasPush: true }), "sent");
    assert.equal(nudgeAvailability({ done: 1, due: 4, alreadyNudged: false, hasPush: false }), "no-push");
    assert.equal(nudgeAvailability({ done: 1, due: 4, alreadyNudged: false, hasPush: true }), "available");
  });

  it("names the sender and the habits still open", () => {
    assert.deepEqual(buildNudgeCopy("Alex", 2), {
      title: "Alex nudged you",
      body: "2 habits still open today.",
    });
    assert.equal(buildNudgeCopy("Alex", 1).body, "1 habit still open today.");
  });
});
