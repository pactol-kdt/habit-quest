import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyGamePatch, buildGamePatch, isEmptyGamePatch } from "./game-patch.ts";
import { resolvePersistentGameState } from "./game-resolution.ts";
import { applyCompleteHabitForToday, applyUncompleteHabitForToday } from "./habit-mutations.ts";
import { createSeedData } from "./seed.ts";
import { DAILY_LOGIN_COINS } from "./constants.ts";
import { hasClaimedDailyReward } from "./utils.ts";
import type { HabitQuestData } from "../../types/habitquest.ts";

describe("game patch merge", () => {
  it("applies only provided slices", () => {
    const base = createSeedData();
    const nextWallet = {
      ...base.wallet,
      totalCoins: base.wallet.totalCoins + 5,
      lifetimeCoinsEarned: base.wallet.lifetimeCoinsEarned + 5,
    };
    const patched = applyGamePatch(base, {
      wallet: nextWallet,
      updatedAt: "2026-08-07T12:00:00.000Z",
    });

    assert.equal(patched.wallet.totalCoins, nextWallet.totalCoins);
    assert.equal(patched.userProgress.totalExp, base.userProgress.totalExp);
    assert.equal(patched.achievements.length, base.achievements.length);
    assert.deepEqual(patched.seasonPass, base.seasonPass);
  });

  it("omits unchanged slices from buildGamePatch", () => {
    const before = createSeedData();
    const after: HabitQuestData = {
      ...before,
      wallet: {
        ...before.wallet,
        totalCoins: before.wallet.totalCoins + 1,
        lifetimeCoinsEarned: before.wallet.lifetimeCoinsEarned + 1,
      },
    };
    const patch = buildGamePatch(before, after);
    assert.ok(patch.wallet);
    assert.equal(patch.achievements, undefined);
    assert.equal(patch.seasonPass, undefined);
    assert.equal(patch.shopItems, undefined);
    assert.ok(patch.deltas);
    assert.equal(patch.deltas.coins, 1);
  });
});

describe("complete / uncomplete patch includes wallet + progress", () => {
  it("resolving a Done grant writes wallet and userProgress into the patch", () => {
    const before = createSeedData();
    before.rewardSystems = {
      ...before.rewardSystems,
      progressSettledThroughDate: "2026-08-06",
    };
    const habitId = before.habits[0]!.id;
    const today = "2026-08-07";

    const completed = applyCompleteHabitForToday(before, habitId, today);
    assert.equal(completed.ok, true);
    if (!completed.ok) {
      return;
    }

    const resolved = resolvePersistentGameState(completed.data, { today });
    const patch = buildGamePatch(before, resolved.data);

    assert.ok(patch.completions?.length);
    assert.ok(patch.wallet, "complete patch must include wallet");
    assert.ok(patch.userProgress, "complete patch must include userProgress");
    assert.ok(
      (patch.userProgress.totalExp ?? 0) >= before.userProgress.totalExp,
      "XP should not drop after a Done",
    );
    // First clear may unlock achievements — only include them when changed.
    if (patch.achievements) {
      assert.ok(patch.achievements.every((entry) => entry.unlocked));
    }
  });

  it("undo patch can claw back live-day wallet/progress without a full save", () => {
    const before = createSeedData();
    before.rewardSystems = {
      ...before.rewardSystems,
      progressSettledThroughDate: "2026-08-06",
    };
    const habitId = before.habits[0]!.id;
    const today = "2026-08-07";

    const completed = applyCompleteHabitForToday(before, habitId, today);
    assert.equal(completed.ok, true);
    if (!completed.ok) {
      return;
    }
    const afterComplete = resolvePersistentGameState(completed.data, { today }).data;

    const undone = applyUncompleteHabitForToday(afterComplete, habitId, today);
    assert.equal(undone.ok, true);
    if (!undone.ok) {
      return;
    }
    const afterUndo = resolvePersistentGameState(undone.data, { today }).data;
    const patch = buildGamePatch(afterComplete, afterUndo);

    assert.ok(patch.removedCompletions?.length);
    assert.ok(patch.wallet || patch.userProgress || patch.rewardSystems);
    assert.equal(isEmptyGamePatch(patch), false);
  });
});

describe("settle grants daily login once", () => {
  it("pays daily login coins the first time and is idempotent after", () => {
    const today = "2026-08-07";
    const base = createSeedData();
    base.dailyRewards = {
      lastLoginDate: "2026-08-06",
      claimedDailyLoginDate: "2026-08-06",
      claimedDailyCompletionRewardDate: null,
    };
    base.rewardSystems = {
      ...base.rewardSystems,
      progressSettledThroughDate: "2026-08-06",
    };

    const first = resolvePersistentGameState(base, {
      processDailyLogin: true,
      today,
    });
    assert.equal(hasClaimedDailyReward(first.data.dailyRewards, "login", today), true);
    assert.equal(
      first.data.wallet.totalCoins,
      base.wallet.totalCoins + DAILY_LOGIN_COINS,
    );

    const second = resolvePersistentGameState(first.data, {
      processDailyLogin: true,
      today,
    });
    assert.equal(second.data.wallet.totalCoins, first.data.wallet.totalCoins);
    assert.equal(second.data.dailyRewards.claimedDailyLoginDate, today);

    const empty = buildGamePatch(first.data, second.data);
    // May still touch lastLoginDate — but must not pay again.
    assert.equal(
      (empty.deltas?.coins ?? 0) === 0 || empty.wallet === undefined,
      true,
    );
  });
});
