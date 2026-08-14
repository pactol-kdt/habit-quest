import { clearBrokenStackLinks, canLinkStackAfter, wouldCreateStackCycle } from "~/lib/habitquest/habit-loop";
import {
  createId,
  getTodayDateKey,
  normalizeFormValues,
  removeCompletionsFromProgress,
} from "~/lib/habitquest/utils";
import type { Habit, HabitFormValues, HabitQuestData } from "~/types/habitquest";

export type HabitCrudResult =
  | {
      ok: true;
      data: HabitQuestData;
      habit: Habit | null;
      habitId: string;
      removedExpHistoryIds: string[];
    }
  | { ok: false; error: string };

function buildHabitFields(values: HabitFormValues) {
  const normalized = normalizeFormValues(values);
  if (!normalized.title) {
    return null;
  }

  return {
    title: normalized.title,
    description: normalized.description,
    difficulty: normalized.difficulty,
    recurrence: normalized.recurrence,
    customDays:
      normalized.recurrence === "custom" || normalized.recurrence === "weekly"
        ? normalized.customDays
        : [],
    stackAfter: normalized.stackAfter,
    stackAfterHabitId: normalized.stackAfterHabitId,
    cueTime: normalized.cueTime,
    cueContext: normalized.cueContext,
    identityWhy: normalized.identityWhy,
    desiredFeeling: normalized.desiredFeeling,
    tinyVersion: normalized.tinyVersion,
  };
}

function resolveChainStackLink(
  habits: Habit[],
  habitId: string,
  stackAfterHabitId: string | null,
): { ok: true; stackAfterHabitId: string | null } | { ok: false; error: string } {
  if (!stackAfterHabitId) {
    return { ok: true, stackAfterHabitId: null };
  }

  if (!habits.some((entry) => entry.id === stackAfterHabitId)) {
    return { ok: true, stackAfterHabitId: null };
  }

  if (stackAfterHabitId === habitId) {
    return { ok: true, stackAfterHabitId: null };
  }

  if (!canLinkStackAfter(habits, stackAfterHabitId, habitId)) {
    return {
      ok: false,
      error: "Chains are one step at a time — that habit already has a next habit.",
    };
  }

  if (wouldCreateStackCycle(habits, habitId, stackAfterHabitId)) {
    return {
      ok: false,
      error: "That stack would loop. Pick an earlier habit in the chain.",
    };
  }

  return { ok: true, stackAfterHabitId };
}

export function applyCreateHabit(
  data: HabitQuestData,
  values: HabitFormValues,
  habitId = createId("habit"),
): HabitCrudResult {
  const fields = buildHabitFields(values);
  if (!fields) {
    return { ok: false, error: "Title is required." };
  }

  const link = resolveChainStackLink(data.habits, habitId, fields.stackAfterHabitId);
  if (!link.ok) {
    return { ok: false, error: link.error };
  }

  const now = new Date().toISOString();
  const habit: Habit = {
    id: habitId,
    ...fields,
    stackAfterHabitId: link.stackAfterHabitId,
    createdAt: now,
    updatedAt: now,
  };

  return {
    ok: true,
    data: {
      ...data,
      habits: [habit, ...data.habits],
    },
    habit,
    habitId,
    removedExpHistoryIds: [],
  };
}

export function applyUpdateHabit(
  data: HabitQuestData,
  habitId: string,
  values: HabitFormValues,
): HabitCrudResult {
  const fields = buildHabitFields(values);
  if (!fields) {
    return { ok: false, error: "Title is required." };
  }

  const existing = data.habits.find((entry) => entry.id === habitId);
  if (!existing) {
    return { ok: false, error: "Habit not found." };
  }

  const link = resolveChainStackLink(data.habits, habitId, fields.stackAfterHabitId);
  if (!link.ok) {
    return { ok: false, error: link.error };
  }

  const habit: Habit = {
    ...existing,
    ...fields,
    stackAfterHabitId: link.stackAfterHabitId,
    updatedAt: new Date().toISOString(),
  };

  return {
    ok: true,
    data: {
      ...data,
      habits: data.habits.map((entry) => (entry.id === habitId ? habit : entry)),
    },
    habit,
    habitId,
    removedExpHistoryIds: [],
  };
}

export function applyDeleteHabit(
  data: HabitQuestData,
  habitId: string,
  today = getTodayDateKey(),
): HabitCrudResult {
  const habit = data.habits.find((entry) => entry.id === habitId);
  if (!habit) {
    return { ok: false, error: "Habit not found." };
  }

  const removedCompletions = data.completions.filter(
    (completion) => completion.habitId === habitId,
  );
  const titleMap = new Map(data.habits.map((entry) => [entry.id, entry.title] as const));
  const settledThrough = data.rewardSystems.progressSettledThroughDate;
  const settledRemovals = removedCompletions.filter((completion) =>
    settledThrough ? completion.date <= settledThrough : completion.date < today,
  );
  const remainingCompletions = data.completions.filter(
    (completion) => completion.habitId !== habitId,
  );

  let nextData: HabitQuestData = {
    ...data,
    habits: clearBrokenStackLinks(
      data.habits.filter((entry) => entry.id !== habitId),
      habitId,
    ),
    completions: remainingCompletions,
  };

  const previousExpIds = new Set(data.userProgress.expHistory.map((entry) => entry.id));

  if (settledRemovals.length) {
    nextData = removeCompletionsFromProgress(
      {
        ...nextData,
        completions: [...remainingCompletions, ...settledRemovals],
      },
      settledRemovals,
      titleMap,
    );
    nextData = {
      ...nextData,
      completions: remainingCompletions,
    };
  }

  const removedExpHistoryIds = [...previousExpIds].filter(
    (id) => !nextData.userProgress.expHistory.some((entry) => entry.id === id),
  );

  return {
    ok: true,
    data: nextData,
    habit: null,
    habitId,
    removedExpHistoryIds,
  };
}
