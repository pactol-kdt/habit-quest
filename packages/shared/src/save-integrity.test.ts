import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mergeCompletionsForFullSave,
  validateSaveIntegrity,
} from "./save-integrity.ts";
import { createSeedData } from "./seed.ts";
import type { HabitCompletion } from "./types.ts";

function makeCompletion(habitId: string, date: string): HabitCompletion {
  return {
    id: `c_${habitId}_${date}`,
    habitId,
    date,
    expEarned: 10,
    streakBonusExp: 0,
    completedAt: `${date}T12:00:00.000Z`,
  };
}

describe("mergeCompletionsForFullSave", () => {
  it("keeps cloud history a stale snapshot forgot", () => {
    const existing = [
      makeCompletion("habit_a", "2026-09-01"),
      makeCompletion("habit_a", "2026-09-10"),
    ];
    const incoming = [makeCompletion("habit_a", "2026-09-10")];
    const merged = mergeCompletionsForFullSave(existing, incoming);
    assert.equal(merged.length, 2);
    assert.ok(merged.some((entry) => entry.date === "2026-09-01"));
    assert.ok(merged.some((entry) => entry.date === "2026-09-10"));
  });
});

describe("validateSaveIntegrity", () => {
  it("allows a completion on local tomorrow vs the server clock", () => {
    const data = createSeedData();
    const habitId = data.habits[0]!.id;
    data.completions = [makeCompletion(habitId, "2026-09-10")];
    const result = validateSaveIntegrity(data, null, "2026-09-09");
    assert.equal(result.ok, true);
  });

  it("rejects completions more than one day ahead", () => {
    const data = createSeedData();
    const habitId = data.habits[0]!.id;
    data.completions = [makeCompletion(habitId, "2026-09-11")];
    const result = validateSaveIntegrity(data, null, "2026-09-09");
    assert.equal(result.ok, false);
  });

  it("allows orphan completions after a habit is removed", () => {
    const data = createSeedData();
    data.completions = [makeCompletion("deleted_habit", "2026-09-01")];
    const result = validateSaveIntegrity(data, null, "2026-09-09");
    assert.equal(result.ok, true);
  });
});
