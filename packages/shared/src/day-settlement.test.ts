import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyCompleteHabitForToday,
  applyUncompleteHabitForToday,
  previewPurchaseUndoRisk,
  previewUndoWalletImpact,
} from "./habit-mutations.ts";
import {
  getEffectiveUserProgress,
  getPendingHabitExp,
  prepareSaveForRewards,
  settleHabitDayProgress,
} from "./day-settlement.ts";
import { applyClaimSeasonPassLevel } from "./reward-claim-mutations.ts";
import { createSeedData } from "./seed.ts";
import { isFeatureUnlocked } from "./utils.ts";
import type { HabitCompletion } from "./types.ts";

function makeCompletion(habitId: string, date: string, expEarned = 10): HabitCompletion {
  return {
    id: `c_${habitId}_${date}`,
    habitId,
    date,
    expEarned,
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

    const preview = previewUndoWalletImpact(settled.data, habitId, today);
    assert.equal(preview.ok, true);
    if (!preview.ok) {
      return;
    }
    assert.equal(preview.goesNegative, true);
    assert.equal(preview.coinsAfter, afterUndo.data.wallet.totalCoins);

    const held = settleHabitDayProgress(completed.data, today);
    const buffered = {
      ...held.data,
      wallet: {
        ...held.data.wallet,
        totalCoins: held.data.wallet.totalCoins + 10_000,
      },
    };
    assert.equal(previewPurchaseUndoRisk(held.data, 0, today).risksClawback, false);
    assert.equal(
      previewPurchaseUndoRisk(held.data, held.data.wallet.totalCoins, today).risksClawback,
      true,
    );
    assert.equal(previewPurchaseUndoRisk(buffered, 1, today).risksClawback, false);
  });
});

describe("prepareSaveForRewards", () => {
  it("unlocks the season pass and reaches tier 3 from clears the cloud row has not settled", () => {
    const data = createSeedData();
    const today = "2026-09-24";
    data.rewardSystems = {
      ...data.rewardSystems,
      progressSettledThroughDate: "2026-09-23",
    };
    data.seasonPass = { ...data.seasonPass, xp: 0, level: 1, claimedLevels: [] };
    data.levelUnlocks = data.levelUnlocks.map((unlock) =>
      unlock.feature === "season-pass"
        ? { ...unlock, requiredLevel: 1, unlocked: false, unlockedAt: null }
        : unlock,
    );
    data.completions = [0, 1, 2, 3].map((index) =>
      makeCompletion(`habit_${index}`, today, 40),
    );

    const ready = prepareSaveForRewards(data, today);
    assert.equal(isFeatureUnlocked(ready.levelUnlocks, "season-pass"), true);
    assert.ok(ready.seasonPass.level >= 3);

    const claim = applyClaimSeasonPassLevel(ready, 3);
    assert.equal(claim.ok, true);
  });
});
