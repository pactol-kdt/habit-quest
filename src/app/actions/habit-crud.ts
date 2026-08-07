"use server";

import { getCurrentUser } from "~/lib/auth/session";
import { ensureDatabase } from "~/lib/db";
import { loadCatalogFromDb } from "~/lib/db/catalog-repository";
import {
  loadNormalizedSave,
  persistHabitCreate,
  persistHabitDelete,
  persistHabitUpdate,
} from "~/lib/db/habitquest-repository";
import {
  applyCreateHabit,
  applyDeleteHabit,
  applyUpdateHabit,
} from "~/lib/habitquest/habit-crud-mutations";
import type { Habit, HabitFormValues, UserProgress } from "~/types/habitquest";

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

function isFormValues(value: unknown): value is HabitFormValues {
  if (!value || typeof value !== "object") {
    return false;
  }
  const form = value as HabitFormValues;
  return (
    typeof form.title === "string" &&
    typeof form.description === "string" &&
    typeof form.difficulty === "string" &&
    typeof form.recurrence === "string" &&
    Array.isArray(form.customDays)
  );
}

export async function createHabitAction(
  values: HabitFormValues,
  habitId?: string,
): Promise<HabitCrudActionResult> {
  try {
    if (!isFormValues(values)) {
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

    const mutation = applyCreateHabit(existing.data, values, habitId);
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

export async function updateHabitAction(
  habitId: string,
  values: HabitFormValues,
): Promise<HabitCrudActionResult> {
  try {
    if (!habitId || !isFormValues(values)) {
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

    const mutation = applyUpdateHabit(existing.data, habitId, values);
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

export async function deleteHabitAction(habitId: string): Promise<HabitCrudActionResult> {
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
