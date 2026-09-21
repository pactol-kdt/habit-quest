import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldFireReminder } from "./reminders.ts";
import { buildCueHourReminderCopy } from "./reminder-copy.ts";
import {
  getActiveLocalPushSlot,
  getClockMinutesInTimeZone,
  getDateKeyInTimeZone,
  getLocalHourInTimeZone,
  hasSentPushSlot,
  hourFromClockTime,
  isWithinReminderHourInTimeZone,
  shouldFireReminderInTimeZone,
  describePushReminderSchedule,
  normalizeReminderTime,
  addHoursToReminderTime,
  snapReminderTimeToHour,
  cueSlotKey,
  digestSlotKey,
  resolvePushSlotsForHour,
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

  it("reads the hour from a cue without defaulting empty times", () => {
    assert.equal(hourFromClockTime("07:30"), 7);
    assert.equal(hourFromClockTime("08:00"), 8);
    assert.equal(hourFromClockTime(null), null);
    assert.equal(hourFromClockTime(""), null);
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
    assert.equal(getLocalHourInTimeZone("UTC", now), 8);
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

  it("resolves digest from the player's local reminder time and ignores the old follow-up hour", () => {
    const digestHour = new Date("2026-08-14T08:15:00.000Z");
    const followUpHour = new Date("2026-08-14T22:20:00.000Z");
    const quietHour = new Date("2026-08-14T12:00:00.000Z");

    assert.equal(getActiveLocalPushSlot("08:00", "UTC", quietHour), null);
    assert.equal(getActiveLocalPushSlot("08:00", "UTC", followUpHour), null);

    const digest = getActiveLocalPushSlot("08:00", "UTC", digestHour);
    assert.equal(digest?.kind, "digest");
    assert.equal(digest?.slotKey, "2026-08-14:d");
  });

  it("describes the fixed 6:00 AM digest even if a stored time is passed", () => {
    assert.equal(
      describePushReminderSchedule("08:00"),
      "at 6:00 AM for habits without a time, and during each habit's hour if still due",
    );
    assert.equal(
      describePushReminderSchedule("07:00"),
      "at 6:00 AM for habits without a time, and during each habit's hour if still due",
    );
    assert.equal(
      describePushReminderSchedule(),
      "at 6:00 AM for habits without a time, and during each habit's hour if still due",
    );
  });
});

describe("cue-hour push slots", () => {
  const morning = { id: "stretch", cueTime: "07:30" };
  const alsoMorning = { id: "journal", cueTime: "07:45" };
  const evening = { id: "walk", cueTime: "18:00" };
  const uncued = { id: "water", cueTime: null };

  it("matches a 07:30 cue during 07:00–07:59, not 08:00", () => {
    const seven = resolvePushSlotsForHour({
      incomplete: [morning],
      reminderTime: "08:00",
      localDateKey: "2026-08-14",
      localHour: 7,
    });
    assert.deepEqual(seven, [
      {
        kind: "cue",
        slotKey: "2026-08-14:c:07",
        hour: 7,
        habitIds: ["stretch"],
      },
    ]);

    const eight = resolvePushSlotsForHour({
      incomplete: [morning],
      reminderTime: "08:00",
      localDateKey: "2026-08-14",
      localHour: 8,
    });
    assert.equal(eight.some((slot) => slot.kind === "cue"), false);
  });

  it("batches two habits in the same hour into one slot", () => {
    const slots = resolvePushSlotsForHour({
      incomplete: [morning, alsoMorning, evening],
      reminderTime: "08:00",
      localDateKey: "2026-08-14",
      localHour: 7,
    });
    assert.equal(slots.length, 1);
    assert.equal(slots[0]?.kind, "cue");
    assert.deepEqual(slots[0]?.habitIds, ["stretch", "journal"]);
    assert.equal(slots[0]?.slotKey, cueSlotKey("2026-08-14", 7));
  });

  it("omits a cleared habit that is not in the incomplete list", () => {
    const slots = resolvePushSlotsForHour({
      incomplete: [alsoMorning],
      reminderTime: "08:00",
      localDateKey: "2026-08-14",
      localHour: 7,
    });
    assert.deepEqual(slots[0]?.habitIds, ["journal"]);
  });

  it("skips the hour when nothing incomplete matches", () => {
    const slots = resolvePushSlotsForHour({
      incomplete: [],
      reminderTime: "08:00",
      localDateKey: "2026-08-14",
      localHour: 8,
    });
    assert.deepEqual(slots, []);
  });

  it("does not fire digest when every incomplete habit has a cue", () => {
    const slots = resolvePushSlotsForHour({
      incomplete: [morning, evening],
      reminderTime: "08:00",
      localDateKey: "2026-08-14",
      localHour: 8,
    });
    assert.deepEqual(slots, []);
  });

  it("fires digest only for uncued incomplete habits at reminderTime", () => {
    const slots = resolvePushSlotsForHour({
      incomplete: [morning, uncued],
      reminderTime: "08:00",
      localDateKey: "2026-08-14",
      localHour: 8,
    });
    assert.deepEqual(slots, [
      {
        kind: "digest",
        slotKey: digestSlotKey("2026-08-14"),
        hour: 8,
        habitIds: ["water"],
      },
    ]);
  });

  it("can send cue and digest in the same hour without mixing habit ids", () => {
    const slots = resolvePushSlotsForHour({
      incomplete: [morning, uncued],
      reminderTime: "07:00",
      localDateKey: "2026-08-14",
      localHour: 7,
    });
    assert.equal(slots.length, 2);
    assert.deepEqual(
      slots.find((slot) => slot.kind === "cue")?.habitIds,
      ["stretch"],
    );
    assert.deepEqual(
      slots.find((slot) => slot.kind === "digest")?.habitIds,
      ["water"],
    );
  });

  it("does not treat the old +14h follow-up hour as an active slot", () => {
    const slots = resolvePushSlotsForHour({
      incomplete: [uncued],
      reminderTime: "08:00",
      localDateKey: "2026-08-14",
      localHour: 22,
    });
    assert.deepEqual(slots, []);
    assert.equal(getActiveLocalPushSlot("08:00", "UTC", new Date("2026-08-14T22:20:00.000Z")), null);
  });

  it("gates each slot key once per local day", () => {
    const sent = new Set(["2026-08-14:c:07", "2026-08-14:d"]);
    assert.equal(hasSentPushSlot(sent, "2026-08-14:c:07"), true);
    assert.equal(hasSentPushSlot(sent, "2026-08-14:c:18"), false);
    assert.equal(hasSentPushSlot(sent, "2026-08-14:d"), true);
    assert.equal(hasSentPushSlot(sent, "2026-08-15:d"), false);
  });
});

describe("cue-hour copy", () => {
  it("keeps single-habit trigger copy", () => {
    const copy = buildCueHourReminderCopy("Ada", [{ title: "Stretch" }]);
    assert.equal(copy.title, "Habit trigger");
    assert.equal(copy.body, "Ada: time for Stretch.");
  });

  it("lists same-hour habits in one body", () => {
    const copy = buildCueHourReminderCopy("Ada", [
      { title: "Stretch" },
      { title: "Journal" },
    ]);
    assert.equal(copy.title, "Habits waiting");
    assert.equal(copy.body, "Ada: Stretch and Journal.");
  });
});
