import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateUid } from "./generate-uid.ts";
import {
  buildAcceptCopy,
  buildActivityNudgeCopy,
  formatActivityAge,
  buildCheerCopy,
  buildFinishCopy,
  buildFriendRequestCopy,
  buildNudgeCopy,
  buildStreakCopy,
  formatUid,
  isFriendStreakMilestone,
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
      title: "Alex asked you to finish today",
      body: "2 habits still open today.",
    });
    assert.equal(buildNudgeCopy("Alex", 1).body, "1 habit still open today.");
  });

  it("names the sender on a friend request", () => {
    assert.deepEqual(buildFriendRequestCopy("Alex"), {
      title: "Alex sent a friend request",
      body: "Open Friends to accept or decline.",
    });
    assert.equal(buildFriendRequestCopy("  ").title, "A friend sent a friend request");
  });

  it("names a streak milestone and ignores the days in between", () => {
    assert.equal(isFriendStreakMilestone(7), true);
    assert.equal(isFriendStreakMilestone(14), true);
    assert.equal(isFriendStreakMilestone(30), true);
    assert.equal(isFriendStreakMilestone(3), false);
    assert.equal(isFriendStreakMilestone(8), false);
    assert.deepEqual(buildStreakCopy("Alex", 7), {
      title: "Alex reached a 7-day streak",
      body: "7 days in a row.",
    });
  });

  it("keeps today's nudge in the present and older nudges in the past", () => {
    assert.equal(buildActivityNudgeCopy("Sam", true).title, "Sam asked you to finish today");
    assert.equal(buildActivityNudgeCopy("Sam", true).body, "Today's habits are still open.");
    assert.equal(buildActivityNudgeCopy("Sam", false).body, "");
  });

  it("says how long ago an activity happened", () => {
    const now = Date.parse("2026-09-30T12:00:00.000Z");
    assert.equal(formatActivityAge("2026-09-30T12:00:00.000Z", now), "Just now");
    assert.equal(formatActivityAge("2026-09-30T11:00:00.000Z", now), "1hr ago");
    assert.equal(formatActivityAge("2026-09-29T12:00:00.000Z", now), "1d ago");
    assert.equal(formatActivityAge("2026-09-28T12:00:00.000Z", now), "2d ago");
  });

  it("names the friend who accepted", () => {
    assert.deepEqual(buildAcceptCopy("Alex"), {
      title: "Alex accepted your friend request",
      body: "You're friends now.",
    });
  });

  it("names the friend who finished today", () => {
    assert.deepEqual(buildFinishCopy("Alex"), {
      title: "Alex completed a habit today",
      body: "One habit is done.",
    });
  });

  it("cheers a friend without naming the habit", () => {
    assert.deepEqual(buildCheerCopy("Sam"), {
      title: "Sam cheered you on",
      body: "Nice work today.",
    });
    assert.equal(buildCheerCopy("  ").title, "A friend cheered you on");
  });
});
