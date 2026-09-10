import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldFireReminder } from "./reminders.ts";
import {
  getActiveLocalPushSlot,
  getClockMinutesInTimeZone,
  getDateKeyInTimeZone,
  hasSentPushSlot,
  isWithinReminderHourInTimeZone,
  shouldFireReminderInTimeZone,
  describePushReminderSchedule,
  normalizeReminderTime,
  addHoursToReminderTime,
  snapReminderTimeToHour,
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

describe("reminder time helpers", () => {
  it("normalizes and snaps reminder times", () => {
    assert.equal(normalizeReminderTime("9:05"), "09:05");
    assert.equal(normalizeReminderTime("bad", "07:00"), "07:00");
    assert.equal(snapReminderTimeToHour("09:45"), "09:00");
    assert.equal(addHoursToReminderTime("08:00", 14), "22:00");
    assert.equal(addHoursToReminderTime("20:00", 14), "10:00");
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

  it("resolves digest and follow-up from the player's local reminder time", () => {
    const digestHour = new Date("2026-08-14T08:15:00.000Z");
    const followUpHour = new Date("2026-08-14T22:20:00.000Z");
    const quietHour = new Date("2026-08-14T12:00:00.000Z");

    assert.equal(getActiveLocalPushSlot("08:00", "UTC", quietHour), null);

    const digest = getActiveLocalPushSlot("08:00", "UTC", digestHour);
    assert.equal(digest?.kind, "digest");
    assert.equal(digest?.slotKey, "2026-08-14:d");

    const followUp = getActiveLocalPushSlot("08:00", "UTC", followUpHour);
    assert.equal(followUp?.kind, "followup");
    assert.equal(followUp?.slotKey, "2026-08-14:f");
  });

  it("gates each local slot once without blocking the follow-up", () => {
    assert.equal(hasSentPushSlot("2026-08-14:d", "2026-08-14:d"), true);
    assert.equal(hasSentPushSlot("2026-08-14:d", "2026-08-14:f"), false);
    assert.equal(hasSentPushSlot("2026-08-14:f", "2026-08-14:f"), true);
    assert.equal(hasSentPushSlot("2026-08-14:f", "2026-08-15:d"), false);
    assert.equal(hasSentPushSlot("2026-08-14", "2026-08-14:d"), true);
    assert.equal(hasSentPushSlot("2026-08-14", "2026-08-14:f"), false);
  });

  it("describes the schedule from the chosen local time", () => {
    assert.equal(
      describePushReminderSchedule("08:00"),
      "around 8:00 AM, then a follow-up around 10:00 PM if anything is still due",
    );
    assert.equal(
      describePushReminderSchedule("07:00"),
      "around 7:00 AM, then a follow-up around 9:00 PM if anything is still due",
    );
  });
});
