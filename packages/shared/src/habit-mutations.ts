import { applyCritMultiplier, createDefaultRewardSystems, decrementCombo, getActiveShieldDates, reconcileTodayCombo, rollCritForHabit, updateCombo } from "./rewards";
import { settleHabitDayProgress } from "./day-settlement";
import {
  createId,
  getDifficultyExp,
  getStreakBonus,
  getTodayDateKey,
  hasCompletionForDate,
  syncProgress,
} from "./utils";
import type {
  CelebrationEvent,
  HabitCompletion,
  HabitQuestData,
  RewardSystems,
  RewardToast,
} from "./types";

export type HabitCompletionSyncResult = {
  habitId: string;
  date: string;
  completion: HabitCompletion | null;
  rewardSystems: Pick<RewardSystems, "todayCombo" | "comboDate">;
};

/**
 * Merge a surgical complete/undo response into the *current* client state so
 * concurrent clears for different habits do not clobber each other.
 */
export function mergeHabitCompletionIntoState(
  current: HabitQuestData,
  result: HabitCompletionSyncResult,
): HabitQuestData {
  const completionsWithout = current.completions.filter(
    (entry) => !(entry.habitId === result.habitId && entry.date === result.date),
  );
  const completions = result.completion
    ? [result.completion, ...completionsWithout]
    : completionsWithout;

  return {
    ...current,
    completions,
    rewardSystems: reconcileTodayCombo(
      {
        ...(current.rewardSystems ?? createDefaultRewardSystems()),
        todayCombo: result.rewardSystems.todayCombo,
        comboDate: result.rewardSystems.comboDate,
      },
      completions,
      result.date,
    ),
  };
}

export type HabitBatchCompletionSyncResult = {
  date: string;
  completions: Array<{ habitId: string; completion: HabitCompletion | null }>;
  rewardSystems: Pick<RewardSystems, "todayCombo" | "comboDate">;
};

/** Merge many same-day clear results from a batch complete response. */
export function mergeHabitCompletionsIntoState(
  current: HabitQuestData,
  result: HabitBatchCompletionSyncResult,
): HabitQuestData {
  const touched = new Set(result.completions.map((entry) => entry.habitId));
  const completionsWithout = current.completions.filter(
    (entry) => !(touched.has(entry.habitId) && entry.date === result.date),
  );
  const added = result.completions
    .map((entry) => entry.completion)
    .filter((entry): entry is HabitCompletion => Boolean(entry));
  const completions = [...added, ...completionsWithout];

  return {
    ...current,
    completions,
    rewardSystems: reconcileTodayCombo(
      {
        ...(current.rewardSystems ?? createDefaultRewardSystems()),
        todayCombo: result.rewardSystems.todayCombo,
        comboDate: result.rewardSystems.comboDate,
      },
      completions,
      result.date,
    ),
  };
}

export type HabitMutationResult =
  | {
      ok: true;
      data: HabitQuestData;
      completion: HabitCompletion | null;
      rewardToasts: RewardToast[];
      celebration: CelebrationEvent | null;
    }
  | { ok: false; error: string };

export function applyCompleteHabitForToday(
  data: HabitQuestData,
  habitId: string,
  today = getTodayDateKey(),
): HabitMutationResult {
  if (hasCompletionForDate(data.completions, habitId, today)) {
    return { ok: false, error: "Already completed today." };
  }

  const habit = data.habits.find((entry) => entry.id === habitId);
  if (!habit) {
    return { ok: false, error: "Habit not found." };
  }

  const isCrit = rollCritForHabit(habitId, today);
  const baseExp = applyCritMultiplier(getDifficultyExp(habit.difficulty), isCrit);
  const hadCompletionToday = data.completions.some((completion) => completion.date === today);

  let rewardSystems = updateCombo(
    data.rewardSystems ?? createDefaultRewardSystems(),
    today,
  );

  const provisionalCompletion: HabitCompletion = {
    id: createId("completion"),
    habitId,
    date: today,
    expEarned: baseExp,
    streakBonusExp: 0,
    completedAt: new Date().toISOString(),
    crit: isCrit || undefined,
  };

  const nextCompletions = [provisionalCompletion, ...data.completions];
  const shieldDates = getActiveShieldDates(rewardSystems);
  const previewProgress = syncProgress(
    data.userProgress,
    nextCompletions,
    {
      totalCompletedHabits: nextCompletions.length,
      totalExp: data.userProgress.totalExp + baseExp,
      expHistory: data.userProgress.expHistory,
    },
    shieldDates,
    today,
  );

  const streakBonus = hadCompletionToday ? 0 : getStreakBonus(previewProgress.currentStreak);
  const completion: HabitCompletion = {
    ...provisionalCompletion,
    streakBonusExp: streakBonus,
  };

  rewardSystems = reconcileTodayCombo(rewardSystems, [completion, ...data.completions], today);

  const nextData: HabitQuestData = {
    ...data,
    completions: [completion, ...data.completions],
    rewardSystems,
  };

  return {
    ok: true,
    data: nextData,
    completion,
    rewardToasts: [],
    celebration: null,
  };
}

export function applyUncompleteHabitForToday(
  data: HabitQuestData,
  habitId: string,
  today = getTodayDateKey(),
): HabitMutationResult {
  const completion = data.completions.find(
    (entry) => entry.habitId === habitId && entry.date === today,
  );

  if (!completion) {
    return { ok: false, error: "No Done to undo for today." };
  }

  const completions = data.completions.filter((entry) => entry.id !== completion.id);
  const rewardSystems = reconcileTodayCombo(
    decrementCombo(data.rewardSystems ?? createDefaultRewardSystems(), today),
    completions,
    today,
  );

  return {
    ok: true,
    data: {
      ...data,
      completions,
      rewardSystems,
    },
    completion: null,
    rewardToasts: [],
    celebration: null,
  };
}

export type UndoWalletImpact =
  | { ok: false; error: string }
  | {
      ok: true;
      coinsBefore: number;
      coinsAfter: number;
      clawback: number;
      goesNegative: boolean;
    };

/**
 * Simulate undo + live-day settle to see if reclaiming today's coins
 * would leave the wallet negative (e.g. spent Done rewards in the Shop).
 */
export function previewUndoWalletImpact(
  data: HabitQuestData,
  habitId: string,
  today = getTodayDateKey(),
): UndoWalletImpact {
  const mutation = applyUncompleteHabitForToday(data, habitId, today);
  if (!mutation.ok) {
    return { ok: false, error: mutation.error };
  }

  const settled = settleHabitDayProgress(mutation.data, today);
  const coinsBefore = data.wallet.totalCoins;
  const coinsAfter = settled.data.wallet.totalCoins;
  return {
    ok: true,
    coinsBefore,
    coinsAfter,
    clawback: coinsBefore - coinsAfter,
    goesNegative: coinsAfter < 0,
  };
}

/**
 * True when spending `price` now would make undoing any of today's habits
 * leave the wallet below zero. Shop uses this so the reclaim isn't a surprise.
 */
export function previewPurchaseUndoRisk(
  data: HabitQuestData,
  price: number,
  today = getTodayDateKey(),
) {
  if (price <= 0 || data.wallet.totalCoins < price) {
    return { risksClawback: false };
  }

  const afterSpend: HabitQuestData = {
    ...data,
    wallet: {
      ...data.wallet,
      totalCoins: data.wallet.totalCoins - price,
      lifetimeCoinsSpent: data.wallet.lifetimeCoinsSpent + price,
    },
  };

  const habitIds = new Set(
    data.completions.filter((entry) => entry.date === today).map((entry) => entry.habitId),
  );

  for (const habitId of habitIds) {
    const preview = previewUndoWalletImpact(afterSpend, habitId, today);
    if (preview.ok && preview.goesNegative) {
      return { risksClawback: true };
    }
  }

  return { risksClawback: false };
}
