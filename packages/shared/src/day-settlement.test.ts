import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyCompleteHabitForToday, applyUncompleteHabitForToday } from "./habit-mutations.ts";
import {
  getEffectiveUserProgress,
  getPendingHabitExp,
  settleHabitDayProgress,
} from "./day-settlement.ts";
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
  it("counts today's clear in the streak even before live settle writes EXP", () => {
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

describe("live day settle", () => {
  it("grants today's EXP on settle and rolls it back on undo", () => {
    const data = createSeedData();
    const habitId = data.habits[0]!.id;
    data.rewardSystems = {
      ...data.rewardSystems,
      progressSettledThroughDate: "2026-09-08",
    };
    const today = "2026-09-09";

    const completed = applyCompleteHabitForToday(data, habitId, today);
    assert.equal(completed.ok, true);
    if (!completed.ok || !completed.completion) {
      return;
    }

    const settled = settleHabitDayProgress(completed.data, today);
    assert.ok(settled.data.userProgress.totalExp >= completed.completion.expEarned);
    assert.equal(settled.data.rewardSystems.progressSettledThroughDate, today);
    assert.equal(getPendingHabitExp(settled.data, today), 0);
    assert.ok(settled.data.weeklyBoss.currentHp < settled.data.weeklyBoss.maxHp);

    const undone = applyUncompleteHabitForToday(settled.data, habitId, today);
    assert.equal(undone.ok, true);
    if (!undone.ok) {
      return;
    }

    const afterUndo = settleHabitDayProgress(undone.data, today);
    assert.equal(afterUndo.data.userProgress.totalExp, 0);
    assert.equal(
      afterUndo.data.completions.some((entry) => entry.habitId === habitId && entry.date === today),
      false,
    );
    assert.equal(afterUndo.data.weeklyBoss.currentHp, afterUndo.data.weeklyBoss.maxHp);
  });

  it("lets the wallet go negative if those coins were already spent", () => {
    const data = createSeedData();
    const habitId = data.habits[0]!.id;
    data.completions = [makeCompletion(habitId, "2026-09-01")];
    data.rewardSystems = {
      ...data.rewardSystems,
      progressSettledThroughDate: "2026-09-08",
      lastComebackDate: null,
    };
    const today = "2026-09-09";

    const completed = applyCompleteHabitForToday(data, habitId, today);
    assert.equal(completed.ok, true);
    if (!completed.ok) {
      return;
    }

    const settled = settleHabitDayProgress(completed.data, today);
    const earned = settled.data.wallet.lifetimeCoinsEarned;
    assert.ok(earned > 0);

    settled.data.wallet = {
      ...settled.data.wallet,
      totalCoins: 0,
      lifetimeCoinsSpent: earned,
    };

    const undone = applyUncompleteHabitForToday(settled.data, habitId, today);
    assert.equal(undone.ok, true);
    if (!undone.ok) {
      return;
    }

    const afterUndo = settleHabitDayProgress(undone.data, today);
    assert.ok(afterUndo.data.wallet.totalCoins < 0);
    assert.equal(
      afterUndo.data.wallet.totalCoins,
      afterUndo.data.wallet.lifetimeCoinsEarned - afterUndo.data.wallet.lifetimeCoinsSpent,
    );
  });
});
