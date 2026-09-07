import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldFireReminder } from "./reminders.ts";
import {
  getActivePushSlotUtc,
  getClockMinutesInTimeZone,
  getDateKeyInTimeZone,
  hasSentPushSlot,
  isWithinPushHourUtc,
  isWithinReminderHourInTimeZone,
  shouldFireReminderInTimeZone,
} from "../push/timezone.ts";

describe("shouldFireReminder", () => {
  it("returns false before the reminder minute", () => {
    const now = new Date(2026, 7, 7, 7, 59, 0);
    assert.equal(shouldFireReminder("08:00", now), false);
  });

  it("returns true at and after the reminder minute", () => {
    assert.equal(shouldFireReminder("08:00", new Date(2026, 7, 7, 8, 0, 0)), true);
    assert.equal(shouldFireReminder("08:00", new Date(2026, 7, 7, 15, 30, 0)), true);
  });

  it("rejects invalid times", () => {
    assert.equal(shouldFireReminder("nope", new Date(2026, 7, 7, 8, 0, 0)), false);
  });
});

describe("timezone reminder helpers", () => {
  it("formats a stable date key in UTC", () => {
    const now = new Date("2026-08-14T01:30:00.000Z");
    assert.equal(getDateKeyInTimeZone("UTC", now), "2026-08-14");
  });

  it("reads clock minutes in UTC", () => {
    const now = new Date("2026-08-14T08:15:00.000Z");
    assert.equal(getClockMinutesInTimeZone("UTC", now), 8 * 60 + 15);
  });

  it("gates reminder time in a timezone", () => {
    const before = new Date("2026-08-14T07:59:00.000Z");
    const after = new Date("2026-08-14T08:00:00.000Z");
    assert.equal(shouldFireReminderInTimeZone("08:00", "UTC", before), false);
    assert.equal(shouldFireReminderInTimeZone("08:00", "UTC", after), true);
  });

  it("only matches the local reminder hour window", () => {
    const inHour = new Date("2026-08-14T08:30:00.000Z");
    const afterHour = new Date("2026-08-14T09:00:00.000Z");
    assert.equal(isWithinReminderHourInTimeZone("08:00", "UTC", inHour), true);
    assert.equal(isWithinReminderHourInTimeZone("08:00", "UTC", afterHour), false);
  });

  it("matches the UTC midnight and afternoon push windows", () => {
    const beforeMidnight = new Date("2026-08-13T23:59:00.000Z");
    const midnight = new Date("2026-08-14T00:30:00.000Z");
    const afterMidnight = new Date("2026-08-14T01:00:00.000Z");
    const afternoon = new Date("2026-08-14T14:15:00.000Z");
    const afterAfternoon = new Date("2026-08-14T15:00:00.000Z");
    assert.equal(isWithinPushHourUtc(beforeMidnight), false);
    assert.equal(isWithinPushHourUtc(midnight), true);
    assert.equal(isWithinPushHourUtc(afterMidnight), false);
    assert.equal(isWithinPushHourUtc(afternoon), true);
    assert.equal(isWithinPushHourUtc(afterAfternoon), false);
    assert.equal(getActivePushSlotUtc(midnight)?.kind, "digest");
    assert.equal(getActivePushSlotUtc(midnight)?.slotKey, "2026-08-14T00");
    assert.equal(getActivePushSlotUtc(afternoon)?.kind, "followup");
    assert.equal(getActivePushSlotUtc(afternoon)?.slotKey, "2026-08-14T14");
  });

  it("gates each UTC slot once without blocking the follow-up", () => {
    assert.equal(hasSentPushSlot("2026-08-14T00", "2026-08-14T00"), true);
    assert.equal(hasSentPushSlot("2026-08-14T00", "2026-08-14T14"), false);
    assert.equal(hasSentPushSlot("2026-08-14T14", "2026-08-14T14"), true);
    assert.equal(hasSentPushSlot("2026-08-14T14", "2026-08-15T00"), false);
    assert.equal(hasSentPushSlot("2026-08-14", "2026-08-14T00"), true);
    assert.equal(hasSentPushSlot("2026-08-14", "2026-08-14T14"), false);
  });
});
