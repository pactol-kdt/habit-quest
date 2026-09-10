import { getComboRewards, hitComboCoinMilestone } from "./combo";
import { describeCraving, describeStackFormula } from "./habit-loop";
import {
  applyCritMultiplier,
  createCelebration,
  createDefaultRewardSystems,
  decrementCombo,
  getActiveShieldDates,
  reconcileTodayCombo,
  rollCritForHabit,
  updateCombo,
} from "./rewards";
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

function createToast(
  type: RewardToast["type"],
  title: string,
  description: string,
): RewardToast {
  return {
    id: createId("toast"),
    type,
    title,
    description,
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
  const previousCombo =
    data.rewardSystems?.comboDate === today ? data.rewardSystems.todayCombo : 0;
  const nextCombo = rewardSystems.todayCombo;
  const comboPreview = getComboRewards(nextCombo);

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

  const pendingBits = [
    `Combo x${nextCombo}`,
    comboPreview.exp > 0 ? `+${comboPreview.exp} combo EXP pending` : null,
  ].filter(Boolean);

  const craving = describeCraving(habit);
  const stackLine = describeStackFormula(habit, data.habits);
  const rewardToasts: RewardToast[] = [
    createToast(
      "unlock",
      "Pending clear",
      `${habit.title} logged — ${pendingBits.join(" · ")}. Locks in at midnight.`,
    ),
  ];
  if (craving) {
    rewardToasts.unshift(
      createToast(
        "achievement",
        craving,
        stackLine
          ? `Loop closed: ${stackLine}`
          : habit.identityWhy.trim() || "Trigger → response → reward. Nice.",
      ),
    );
  }
  let celebration: CelebrationEvent | null = null;

  if (hitComboCoinMilestone(previousCombo, nextCombo)) {
    rewardToasts.push(
      createToast(
        "coins",
        `Combo x${nextCombo}`,
        `Coin milestone hit — +${getComboRewards(nextCombo).coins} combo coins pending at lock-in.`,
      ),
    );
  }

  if (isCrit) {
    rewardToasts.push(
      createToast("crit", "Critical clear", `${habit.title} hit for double EXP (pending).`),
    );
    celebration = createCelebration(
      "crit",
      "Critical hit!",
      `${habit.title} scored a critical clear (locks in at end of day).`,
    );
  }

  return {
    ok: true,
    data: nextData,
    completion,
    rewardToasts,
    celebration,
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
    return { ok: false, error: "No pending clear for today." };
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
    rewardToasts: [
      createToast("warning", "Completion undone", "Today's pending clear was removed."),
    ],
    celebration: null,
  };
}
