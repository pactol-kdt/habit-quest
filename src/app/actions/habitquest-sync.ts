"use server";

import {
  bootHabitQuestSessionAction as bootHabitQuestSession,
  getHabitQuestMigrationPlanAction as getHabitQuestMigrationPlan,
  pullHabitQuestSaveAction as pullHabitQuestSave,
  pushHabitQuestSaveAction as pushHabitQuestSave,
  syncHabitQuestOnAuthAction as syncHabitQuestOnAuth,
  validateHabitQuestSaveAction as validateHabitQuestSave,
} from "~/lib/v1/sync";
import type { HabitQuestData } from "~/types/habitquest";

export type {
  BootSessionResult,
  PullSaveResult,
  PushSaveResult,
  SyncValidationResult,
} from "~/lib/v1/sync";

export async function validateHabitQuestSaveAction(
  payload: unknown,
  previous: HabitQuestData | null = null,
) {
  return validateHabitQuestSave(payload, previous);
}

export async function pullHabitQuestSaveAction() {
  return pullHabitQuestSave();
}

export async function pushHabitQuestSaveAction(payload: unknown) {
  return pushHabitQuestSave(payload);
}

export async function syncHabitQuestOnAuthAction(
  localPayload: unknown,
  options: { extractLocal?: boolean } = {},
) {
  return syncHabitQuestOnAuth(localPayload, options);
}

export async function bootHabitQuestSessionAction(
  localPayload: unknown,
  options: { extractLocal?: boolean } = {},
) {
  return bootHabitQuestSession(localPayload, options);
}

export async function getHabitQuestMigrationPlanAction() {
  return getHabitQuestMigrationPlan();
}
