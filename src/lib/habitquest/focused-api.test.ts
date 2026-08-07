import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { listClaimableRewards } from "./claimables.ts";
import { applyCompleteHabitForToday, applyUncompleteHabitForToday } from "./habit-mutations.ts";
import { applyCreateHabit, applyDeleteHabit, applyUpdateHabit } from "./habit-crud-mutations.ts";
import { applyPurchaseShopItem } from "./shop-mutations.ts";
import { createSeedData } from "./seed.ts";
import { mergeCloudSaveWithLocalDraft } from "./storage.ts";
import { hasClaimedDailyReward } from "./utils.ts";
import type { HabitQuestData } from "../../types/habitquest.ts";

function withCoins(data: HabitQuestData, coins: number): HabitQuestData {
  return {
    ...data,
    wallet: {
      ...data.wallet,
      totalCoins: coins,
      lifetimeCoinsEarned: Math.max(data.wallet.lifetimeCoinsEarned, coins),
    },
  };
}

describe("daily login claim idempotency (merge)", () => {
  it("keeps the later claimedDailyLoginDate from local draft", () => {
    const cloud = createSeedData();
    cloud.dailyRewards = {
      lastLoginDate: "2026-08-06",
      claimedDailyLoginDate: "2026-08-06",
      claimedDailyCompletionRewardDate: null,
    };

    const local = createSeedData();
    local.dailyRewards = {
      lastLoginDate: "2026-08-07",
      claimedDailyLoginDate: "2026-08-07",
      claimedDailyCompletionRewardDate: null,
    };
    local.wallet = {
      ...local.wallet,
      totalCoins: cloud.wallet.totalCoins + 1,
      lifetimeCoinsEarned: cloud.wallet.lifetimeCoinsEarned + 1,
    };

    const merged = mergeCloudSaveWithLocalDraft(cloud, local, "2026-08-07");
    assert.equal(merged.shouldPush, true);
    assert.equal(merged.data.dailyRewards.claimedDailyLoginDate, "2026-08-07");
    assert.equal(hasClaimedDailyReward(merged.data.dailyRewards, "login", "2026-08-07"), true);
  });
});

describe("habit complete / undo mutators", () => {
  it("complete then undo restores no completion for today", () => {
    const base = createSeedData();
    const habitId = base.habits[0]!.id;
    const today = "2026-08-07";

    const completed = applyCompleteHabitForToday(base, habitId, today);
    assert.equal(completed.ok, true);
    if (!completed.ok) {
      return;
    }
    assert.ok(completed.completion);
    assert.equal(
      completed.data.completions.some((entry) => entry.habitId === habitId && entry.date === today),
      true,
    );

    const undone = applyUncompleteHabitForToday(completed.data, habitId, today);
    assert.equal(undone.ok, true);
    if (!undone.ok) {
      return;
    }
    assert.equal(
      undone.data.completions.some((entry) => entry.habitId === habitId && entry.date === today),
      false,
    );
  });

  it("rejects double complete for the same day", () => {
    const base = createSeedData();
    const habitId = base.habits[0]!.id;
    const today = "2026-08-07";
    const first = applyCompleteHabitForToday(base, habitId, today);
    assert.equal(first.ok, true);
    if (!first.ok) {
      return;
    }
    const second = applyCompleteHabitForToday(first.data, habitId, today);
    assert.equal(second.ok, false);
  });
});

describe("shop purchase vs stale full-save merge", () => {
  it("preserves local ownership and higher spend when cloud is stale", () => {
    const cloud = withCoins(createSeedData(), 500);
    // Force a cheap buyable cosmetic regardless of catalog locks.
    cloud.shopItems = cloud.shopItems.map((item, index) =>
      index === 0
        ? {
            ...item,
            owned: false,
            exclusive: false,
            requiredLevel: 1,
            requiredFeature: null,
            price: 25,
          }
        : item,
    );
    const buyable = cloud.shopItems[0]!;

    const purchased = applyPurchaseShopItem(cloud, buyable.id);
    assert.equal(purchased.ok, true);
    if (!purchased.ok) {
      return;
    }

    // Stale cloud still shows unowned + old wallet.
    const merged = mergeCloudSaveWithLocalDraft(cloud, purchased.data, "2026-08-07");
    assert.equal(merged.shouldPush, true);
    const item = merged.data.shopItems.find((entry) => entry.id === buyable.id);
    assert.equal(item?.owned, true);
    assert.ok(merged.data.wallet.lifetimeCoinsSpent >= purchased.data.wallet.lifetimeCoinsSpent);
  });
});

describe("habit CRUD mutators", () => {
  it("create / update / delete habits", () => {
    const base = createSeedData();
    const created = applyCreateHabit(base, {
      title: "Write tests",
      description: "Cover focused APIs",
      difficulty: "medium",
      recurrence: "daily",
      customDays: [],
    });
    assert.equal(created.ok, true);
    if (!created.ok || !created.habit) {
      return;
    }

    const updated = applyUpdateHabit(created.data, created.habitId, {
      title: "Write better tests",
      description: "Cover focused APIs",
      difficulty: "hard",
      recurrence: "daily",
      customDays: [],
    });
    assert.equal(updated.ok, true);
    if (!updated.ok || !updated.habit) {
      return;
    }
    assert.equal(updated.habit.title, "Write better tests");
    assert.equal(updated.habit.difficulty, "hard");

    const deleted = applyDeleteHabit(updated.data, created.habitId);
    assert.equal(deleted.ok, true);
    if (!deleted.ok) {
      return;
    }
    assert.equal(
      deleted.data.habits.some((habit) => habit.id === created.habitId),
      false,
    );
  });
});

describe("claimable rewards listing", () => {
  it("lists settled boss bounty when defeated and unclaimed", () => {
    const data = createSeedData();
    data.weeklyBoss = {
      ...data.weeklyBoss,
      defeated: true,
      rewardClaimed: false,
    };
    const claimables = listClaimableRewards(data);
    assert.ok(claimables.some((item) => item.kind === "boss"));
  });

  it("lists completed unclaimed challenges when feature unlocked", () => {
    const data = createSeedData();
    data.levelUnlocks = data.levelUnlocks.map((unlock) =>
      unlock.feature === "weekly-challenges" ? { ...unlock, unlocked: true } : unlock,
    );
    const weekly = data.challenges.find((entry) => entry.period === "weekly");
    assert.ok(weekly);
    data.challenges = data.challenges.map((entry) =>
      entry.id === weekly!.id
        ? { ...entry, completed: true, claimed: false, progress: entry.target }
        : entry,
    );
    const claimables = listClaimableRewards(data);
    assert.ok(claimables.some((item) => item.kind === "challenge"));
  });
});
