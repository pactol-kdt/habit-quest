"use server";

import { createHabit, deleteHabit, updateHabit } from "~/lib/v1/habits";
import type { HabitFormValues } from "~/types/habitquest";

export type { HabitCrudActionResult } from "~/lib/v1/habits";

export async function createHabitAction(
  values: HabitFormValues,
  habitId?: string,
) {
  return createHabit(values, habitId);
}

export async function updateHabitAction(habitId: string, values: HabitFormValues) {
  return updateHabit(habitId, values);
}

export async function deleteHabitAction(habitId: string) {
  return deleteHabit(habitId);
}
