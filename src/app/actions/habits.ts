"use server";

import { completeHabit, uncompleteHabit } from "~/lib/v1/habits";

export type { HabitActionResult } from "~/lib/v1/habits";

export async function completeHabitAction(habitId: string, dateKey: string) {
  return completeHabit(habitId, dateKey);
}

export async function uncompleteHabitAction(habitId: string, dateKey: string) {
  return uncompleteHabit(habitId, dateKey);
}
