import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { listClaimableRewards } from "./claimables.ts";
import { COMEBACK_COINS, COMEBACK_EXP } from "./constants.ts";
import { getMotivationalGreeting } from "./copy.ts";
import { applyCompleteHabitForToday, applyUncompleteHabitForToday, mergeHabitCompletionIntoState } from "./habit-mutations.ts";
import { applyCreateHabit, applyDeleteHabit, applyUpdateHabit } from "./habit-crud-mutations.ts";
import { applyClaimChallengeReward } from "./reward-claim-mutations.ts";
import { applyPurchaseShopItem } from "./shop-mutations.ts";
import { getPendingComebackPreview } from "./day-settlement.ts";
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

describe("comeback claim idempotency (merge)", () => {
  it("keeps local lastComebackDate and settled cursor when cloud is behind", () => {
    const cloud = createSeedData();
    cloud.rewardSystems = {
      ...cloud.rewardSystems,
      lastComebackDate: null,
      progressSettledThroughDate: "2026-08-05",
    };

    const local = createSeedData();
    local.rewardSystems = {
      ...local.rewardSystems,
      lastComebackDate: "2026-08-06",
      progressSettledThroughDate: "2026-08-06",
    };
    local.wallet = {
      ...local.wallet,
      totalCoins: cloud.wallet.totalCoins + 12,
      lifetimeCoinsEarned: cloud.wallet.lifetimeCoinsEarned + 12,
    };
    local.userProgress = {
      ...local.userProgress,
      totalExp: cloud.userProgress.totalExp + 40,
      expHistory: [
        {
          id: "exp-comeback",
          amount: 40,
          date: "2026-08-06",
          source: "comeback",
          label: "Comeback bonus",
          createdAt: "2026-08-07T00:00:00.000Z",
        },
        ...local.userProgress.expHistory,
      ],
    };

    const merged = mergeCloudSaveWithLocalDraft(cloud, local, "2026-08-07");
    assert.equal(merged.shouldPush, true);
    assert.equal(merged.data.rewardSystems.lastComebackDate, "2026-08-06");
    assert.equal(merged.data.rewardSystems.progressSettledThroughDate, "2026-08-06");
    assert.equal(merged.data.userProgress.totalExp, local.userProgress.totalExp);
    assert.equal(merged.data.wallet.lifetimeCoinsEarned, local.wallet.lifetimeCoinsEarned);
  });

  it("hides pending comeback preview once lastComebackDate is within a week", () => {
    const data = createSeedData();
    const habitId = data.habits[0]!.id;
    data.completions = [
      {
        id: "c-old",
        habitId,
        date: "2026-07-30",
        completedAt: "2026-07-30T12:00:00.000Z",
        expEarned: 10,
        streakBonusExp: 0,
      },
      {
        id: "c-today",
        habitId,
        date: "2026-08-07",
        completedAt: "2026-08-07T12:00:00.000Z",
        expEarned: 10,
        streakBonusExp: 0,
      },
    ];
    data.rewardSystems = {
      ...data.rewardSystems,
      lastComebackDate: null,
      progressSettledThroughDate: "2026-08-06",
    };

    const pending = getPendingComebackPreview(data, "2026-08-07");
    assert.equal(pending.coins, COMEBACK_COINS);
    assert.equal(pending.exp, COMEBACK_EXP);

    data.rewardSystems = {
      ...data.rewardSystems,
      lastComebackDate: "2026-08-07",
    };
    const claimed = getPendingComebackPreview(data, "2026-08-07");
    assert.equal(claimed.coins, 0);
    assert.equal(claimed.exp, 0);
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

  it("merge keeps concurrent clears for different habits", () => {
    const base = createSeedData();
    const habitA = base.habits[0]!.id;
    const habitB = base.habits[1]!.id;
    const today = "2026-08-07";

    const clearA = applyCompleteHabitForToday(base, habitA, today);
    const clearB = applyCompleteHabitForToday(base, habitB, today);
    assert.equal(clearA.ok, true);
    assert.equal(clearB.ok, true);
    if (!clearA.ok || !clearB.ok || !clearA.completion || !clearB.completion) {
      return;
    }

    // Simulate B finishing first on the client while A is still in flight.
    let current = clearB.data;
    assert.equal(
      current.completions.some((entry) => entry.habitId === habitB && entry.date === today),
      true,
    );
    assert.equal(
      current.completions.some((entry) => entry.habitId === habitA && entry.date === today),
      false,
    );

    // A's response merges into current state instead of replacing it.
    current = mergeHabitCompletionIntoState(current, {
      habitId: habitA,
      date: today,
      completion: clearA.completion,
      rewardSystems: {
        todayCombo: 2,
        comboDate: today,
      },
    });

    assert.equal(
      current.completions.some((entry) => entry.habitId === habitA && entry.date === today),
      true,
    );
    assert.equal(
      current.completions.some((entry) => entry.habitId === habitB && entry.date === today),
      true,
    );
    assert.equal(current.rewardSystems.todayCombo, 2);
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

  it("keeps completion history so deleting a habit does not rewind the streak", () => {
    const base = createSeedData();
    const created = applyCreateHabit(base, {
      title: "Sole morning habit",
      description: "",
      difficulty: "easy",
      recurrence: "daily",
      customDays: [],
    });
    assert.equal(created.ok, true);
    if (!created.ok || !created.habit) {
      return;
    }

    const withHistory = {
      ...created.data,
      completions: [
        {
          id: "c-old",
          habitId: created.habitId,
          date: "2026-09-01",
          expEarned: 10,
          streakBonusExp: 0,
          completedAt: "2026-09-01T12:00:00.000Z",
        },
      ],
    };
    const deleted = applyDeleteHabit(withHistory, created.habitId);
    assert.equal(deleted.ok, true);
    if (!deleted.ok) {
      return;
    }
    assert.equal(deleted.data.completions.length, 1);
    assert.equal(deleted.data.completions[0]?.habitId, created.habitId);
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

describe("challenge title repeat rewards", () => {
  it("grants title toast on first claim and bonus coins when title already owned", () => {
    const base = createSeedData();
    const weekly = base.challenges.find((entry) => entry.period === "weekly");
    assert.ok(weekly);
    const titleId = weekly.reward.titleItemId!;
    assert.ok(titleId);

    const ready = {
      ...base,
      challenges: base.challenges.map((entry) =>
        entry.id === weekly.id
          ? { ...entry, completed: true, claimed: false, progress: entry.target }
          : entry,
      ),
    };

    const first = applyClaimChallengeReward(ready, weekly.id);
    assert.equal(first.ok, true);
    if (!first.ok) {
      return;
    }
    assert.ok(first.rewardToasts.some((toast) => /title/i.test(toast.title)));
    assert.equal(
      first.data.shopItems.find((item) => item.id === titleId)?.owned,
      true,
    );

    const coinsAfterFirst = first.data.wallet.totalCoins;
    const rolled = {
      ...first.data,
      challenges: first.data.challenges.map((entry) =>
        entry.id === weekly.id
          ? { ...entry, completed: true, claimed: false, progress: entry.target }
          : entry,
      ),
    };
    const second = applyClaimChallengeReward(rolled, weekly.id);
    assert.equal(second.ok, true);
    if (!second.ok) {
      return;
    }
    assert.equal(
      second.rewardToasts.some((toast) => /title unlocked/i.test(toast.title)),
      false,
    );
    assert.ok(second.rewardToasts.some((toast) => /repeat/i.test(toast.title)));
    assert.ok(second.data.wallet.totalCoins > coinsAfterFirst + weekly.reward.coins - 1);
  });
});

describe("motivational copy", () => {
  it("returns short headline + support instead of a long monologue", () => {
    const greeting = getMotivationalGreeting({
      ...createSeedData().userProgress,
      currentStreak: 0,
      level: 1,
    });
    assert.ok(greeting.headline.length < 24);
    assert.ok(greeting.support.length > 0);
    assert.equal(/Rise, adventurer|journey warm/i.test(greeting.support), false);
  });
});
