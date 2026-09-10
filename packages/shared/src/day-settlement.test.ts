import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getEffectiveUserProgress } from "./day-settlement.ts";
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

describe("getEffectiveUserProgress", () => {
  it("counts today's pending clear in the streak before midnight lock-in", () => {
    const data = createSeedData();
    const habitId = data.habits[0]!.id;
    data.rewardSystems = {
      ...data.rewardSystems,
      progressSettledThroughDate: "2026-09-08",
    };
    data.completions = [
      makeCompletion(habitId, "2026-09-08"),
      makeCompletion(habitId, "2026-09-09"),
    ];

    const progress = getEffectiveUserProgress(data, "2026-09-09");
    assert.equal(progress.currentStreak, 2);
    assert.equal(progress.lastCompletedDate, "2026-09-09");
    assert.equal(progress.totalExp, 0);
  });
});
