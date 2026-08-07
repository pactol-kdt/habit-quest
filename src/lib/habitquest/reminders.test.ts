import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldFireReminder } from "./reminders.ts";

describe("shouldFireReminder", () => {
  it("returns false before the reminder minute", () => {
    const now = new Date(2026, 7, 7, 8, 59, 0);
    assert.equal(shouldFireReminder("09:00", now), false);
  });

  it("returns true at and after the reminder minute", () => {
    assert.equal(shouldFireReminder("09:00", new Date(2026, 7, 7, 9, 0, 0)), true);
    assert.equal(shouldFireReminder("09:00", new Date(2026, 7, 7, 15, 30, 0)), true);
  });

  it("rejects invalid times", () => {
    assert.equal(shouldFireReminder("nope", new Date(2026, 7, 7, 9, 0, 0)), false);
  });
});
