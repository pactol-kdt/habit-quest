"use server";

import { getCurrentUser } from "~/lib/auth/session";
import { ensureDatabase } from "~/lib/db";
import { loadCatalogFromDb } from "~/lib/db/catalog-repository";
import {
  loadNormalizedSave,
  persistTodayHabitCompletion,
  removeTodayHabitCompletion,
} from "~/lib/db/habitquest-repository";
import {
  applyCompleteHabitForToday,
  applyUncompleteHabitForToday,
} from "~/lib/habitquest/habit-mutations";
import type { HabitCompletion, RewardSystems } from "~/types/habitquest";

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

function isValidDateKey(dateKey: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey);
}

/**
 * Complete a habit for a local calendar day. Client sends habitId + dateKey only.
 */
export async function completeHabitAction(
  habitId: string,
  dateKey: string,
): Promise<HabitActionResult> {
  try {
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
    // Duplicate key = already completed (race / double-submit).
    if (/duplicate|uniq_completions/i.test(message)) {
      return { status: "error", error: "Already completed today." };
    }
    return { status: "error", error: message };
  }
}

/**
 * Undo a pending clear for a local calendar day. Client sends habitId + dateKey only.
 */
export async function uncompleteHabitAction(
  habitId: string,
  dateKey: string,
): Promise<HabitActionResult> {
  try {
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
