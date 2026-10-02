import type { CompletionReflection, CompletionReflectionRecord, Habit, HabitCompletion } from "./types";

const FEELINGS = new Set<CompletionReflection>(["better", "fine", "hard"]);

export function isCompletionReflection(value: unknown): value is CompletionReflection {
  return typeof value === "string" && FEELINGS.has(value as CompletionReflection);
}

export function isCompletionReflectionRecord(value: unknown): value is CompletionReflectionRecord {
  return value === "dismissed" || isCompletionReflection(value);
}

/**
 * Occasional prompt: every 3rd finish when a desired feeling exists, otherwise every 4th.
 * Callers should only show this for the latest finish so rapid clears are not interrupted.
 */
export function shouldOfferReflection(
  completions: HabitCompletion[],
  habit: Habit,
  completion: HabitCompletion,
) {
  if (completion.habitId !== habit.id || isCompletionReflectionRecord(completion.reflection)) {
    return false;
  }

  const count = completions.filter((entry) => entry.habitId === habit.id).length;
  const interval = habit.desiredFeeling.trim() ? 3 : 4;
  return count > 0 && count % interval === 0;
}

export function normalizeCompletionRecord(entry: HabitCompletion): HabitCompletion {
  const reflection = isCompletionReflectionRecord(entry.reflection) ? entry.reflection : undefined;
  return {
    ...entry,
    crit: entry.crit ? true : undefined,
    minimum: entry.minimum === true ? true : undefined,
    reflection,
  };
}
