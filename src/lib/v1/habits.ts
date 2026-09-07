import "server-only";

import { getCurrentUser } from "~/lib/auth/session";
import { ensureDatabase } from "~/lib/db";
import { loadCatalogFromDb } from "~/lib/db/catalog-repository";
import {
  loadNormalizedSave,
  persistHabitCreate,
  persistHabitDelete,
  persistHabitUpdate,
  persistTodayHabitCompletion,
  removeTodayHabitCompletion,
} from "~/lib/db/habitquest-repository";
import {
  applyCreateHabit,
  applyDeleteHabit,
  applyUpdateHabit,
} from "~/lib/habitquest/habit-crud-mutations";
import {
  applyCompleteHabitForToday,
  applyUncompleteHabitForToday,
} from "~/lib/habitquest/habit-mutations";
import { coerceFormValues, isValidDateKey } from "~/lib/v1/parse";
import type { Habit, HabitCompletion, RewardSystems, UserProgress } from "~/types/habitquest";

export type HabitActionResult =
  | {
      status: "ok";
      habitId: string;
      date: string;
      completion: HabitCompletion | null;
      rewardSystems: Pick<RewardSystems, "todayCombo" | "comboDate">;
      updatedAt: string;
    }
  | { status: "unauthenticated" }
  | { status: "error"; error: string };

export type HabitCrudActionResult =
  | {
      status: "ok";
      habitId: string;
      habit: Habit | null;
      userProgress?: Pick<
        UserProgress,
        | "totalExp"
        | "level"
        | "currentStreak"
        | "bestStreak"
        | "totalCompletedHabits"
        | "lastCompletedDate"
      >;
      updatedAt: string;
    }
  | { status: "unauthenticated" }
  | { status: "error"; error: string };

export type ListHabitsResult =
  | { status: "ok"; habits: Habit[]; updatedAt: string }
  | { status: "unauthenticated" }
  | { status: "error"; error: string };

export async function listHabits(): Promise<ListHabitsResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { status: "unauthenticated" };
  }

  try {
    const database = await ensureDatabase();
    const catalog = await loadCatalogFromDb(database);
    const existing = await loadNormalizedSave(database, user.id, catalog);
    if (!existing) {
      return { status: "error", error: "No cloud save found." };
    }

    return {
      status: "ok",
      habits: existing.data.habits,
      updatedAt: existing.updatedAt,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to list habits.",
    };
  }
}

/**
 * Complete a habit for a local calendar day. Caller sends habitId + dateKey only.
 */
export async function completeHabit(
  habitId: string,
  dateKey: string,
): Promise<HabitActionResult> {
  if (!habitId || typeof habitId !== "string") {
    return { status: "error", error: "habitId is required." };
  }
  if (!isValidDateKey(dateKey)) {
    return { status: "error", error: "dateKey must be YYYY-MM-DD." };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { status: "unauthenticated" };
  }

  const database = await ensureDatabase();
  const catalog = await loadCatalogFromDb(database);

  try {
    const existing = await loadNormalizedSave(database, user.id, catalog);
    if (!existing) {
      return { status: "error", error: "No cloud save found." };
    }

    const mutation = applyCompleteHabitForToday(existing.data, habitId, dateKey);
    if (!mutation.ok || !mutation.completion) {
      return { status: "error", error: mutation.ok ? "Missing completion." : mutation.error };
    }

    const saved = await persistTodayHabitCompletion(
      database,
      user.id,
      mutation.completion,
    );

    return {
      status: "ok",
      habitId,
      date: dateKey,
      completion: mutation.completion,
      rewardSystems: {
        todayCombo: saved.todayCombo,
        comboDate: saved.comboDate,
      },
      updatedAt: saved.updatedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to complete habit.";
    // Duplicate key = already completed (race / double-submit) — reconcile as success.
    if (/duplicate|uniq_completions/i.test(message)) {
      const refreshed = await loadNormalizedSave(database, user.id, catalog);
      const existingCompletion = refreshed?.data.completions.find(
        (entry) => entry.habitId === habitId && entry.date === dateKey,
      );
      if (!existingCompletion || !refreshed) {
        return { status: "error", error: "Already completed today." };
      }

      return {
        status: "ok",
        habitId,
        date: dateKey,
        completion: existingCompletion,
        rewardSystems: {
          todayCombo: refreshed.data.rewardSystems.todayCombo,
          comboDate: refreshed.data.rewardSystems.comboDate,
        },
        updatedAt: refreshed.updatedAt,
      };
    }
    return { status: "error", error: message };
  }
}

/**
 * Undo a pending clear for a local calendar day. Caller sends habitId + dateKey only.
 */
export async function uncompleteHabit(
  habitId: string,
  dateKey: string,
): Promise<HabitActionResult> {
  if (!habitId || typeof habitId !== "string") {
    return { status: "error", error: "habitId is required." };
  }
  if (!isValidDateKey(dateKey)) {
    return { status: "error", error: "dateKey must be YYYY-MM-DD." };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { status: "unauthenticated" };
  }

  try {
    const database = await ensureDatabase();
    const catalog = await loadCatalogFromDb(database);
    const existing = await loadNormalizedSave(database, user.id, catalog);
    if (!existing) {
      return { status: "error", error: "No cloud save found." };
    }

    const mutation = applyUncompleteHabitForToday(existing.data, habitId, dateKey);
    if (!mutation.ok) {
      return { status: "error", error: mutation.error };
    }

    const saved = await removeTodayHabitCompletion(database, user.id, habitId, dateKey);

    return {
      status: "ok",
      habitId,
      date: dateKey,
      completion: null,
      rewardSystems: {
        todayCombo: saved.todayCombo,
        comboDate: saved.comboDate,
      },
      updatedAt: saved.updatedAt,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to undo habit clear.",
    };
  }
}

export async function createHabit(
  values: unknown,
  habitId?: string,
): Promise<HabitCrudActionResult> {
  try {
    const formValues = coerceFormValues(values);
    if (!formValues) {
      return { status: "error", error: "Invalid habit form values." };
    }

    const user = await getCurrentUser();
    if (!user) {
      return { status: "unauthenticated" };
    }

    const database = await ensureDatabase();
    const catalog = await loadCatalogFromDb(database);
    const existing = await loadNormalizedSave(database, user.id, catalog);
    if (!existing) {
      return { status: "error", error: "No cloud save found." };
    }

    const mutation = applyCreateHabit(existing.data, formValues, habitId);
    if (!mutation.ok || !mutation.habit) {
      return { status: "error", error: mutation.ok ? "Missing habit." : mutation.error };
    }

    const saved = await persistHabitCreate(database, user.id, mutation.habit);
    return {
      status: "ok",
      habitId: saved.habit.id,
      habit: saved.habit,
      updatedAt: saved.updatedAt,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to create habit.",
    };
  }
}

export async function updateHabit(
  habitId: string,
  values: unknown,
): Promise<HabitCrudActionResult> {
  try {
    const formValues = coerceFormValues(values);
    if (!habitId || !formValues) {
      return { status: "error", error: "Invalid habit update." };
    }

    const user = await getCurrentUser();
    if (!user) {
      return { status: "unauthenticated" };
    }

    const database = await ensureDatabase();
    const catalog = await loadCatalogFromDb(database);
    const existing = await loadNormalizedSave(database, user.id, catalog);
    if (!existing) {
      return { status: "error", error: "No cloud save found." };
    }

    const mutation = applyUpdateHabit(existing.data, habitId, formValues);
    if (!mutation.ok || !mutation.habit) {
      return { status: "error", error: mutation.ok ? "Missing habit." : mutation.error };
    }

    const saved = await persistHabitUpdate(database, user.id, mutation.habit);
    return {
      status: "ok",
      habitId: saved.habit.id,
      habit: saved.habit,
      updatedAt: saved.updatedAt,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to update habit.",
    };
  }
}

export async function deleteHabit(habitId: string): Promise<HabitCrudActionResult> {
  try {
    if (!habitId) {
      return { status: "error", error: "habitId is required." };
    }

    const user = await getCurrentUser();
    if (!user) {
      return { status: "unauthenticated" };
    }

    const database = await ensureDatabase();
    const catalog = await loadCatalogFromDb(database);
    const existing = await loadNormalizedSave(database, user.id, catalog);
    if (!existing) {
      return { status: "error", error: "No cloud save found." };
    }

    const mutation = applyDeleteHabit(existing.data, habitId);
    if (!mutation.ok) {
      return { status: "error", error: mutation.error };
    }

    const saved = await persistHabitDelete(
      database,
      user.id,
      habitId,
      {
        totalExp: mutation.data.userProgress.totalExp,
        level: mutation.data.userProgress.level,
        currentStreak: mutation.data.userProgress.currentStreak,
        bestStreak: mutation.data.userProgress.bestStreak,
        totalCompletedHabits: mutation.data.userProgress.totalCompletedHabits,
        lastCompletedDate: mutation.data.userProgress.lastCompletedDate,
      },
      mutation.removedExpHistoryIds,
    );

    return {
      status: "ok",
      habitId: saved.habitId,
      habit: null,
      userProgress: {
        totalExp: mutation.data.userProgress.totalExp,
        level: mutation.data.userProgress.level,
        currentStreak: mutation.data.userProgress.currentStreak,
        bestStreak: mutation.data.userProgress.bestStreak,
        totalCompletedHabits: mutation.data.userProgress.totalCompletedHabits,
        lastCompletedDate: mutation.data.userProgress.lastCompletedDate,
      },
      updatedAt: saved.updatedAt,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to delete habit.",
    };
  }
}
