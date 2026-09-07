import type { HabitFormValues } from "~/types/habitquest";

export function isValidDateKey(dateKey: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey);
}

export function coerceFormValues(value: unknown): HabitFormValues | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const form = value as Partial<HabitFormValues>;
  if (
    typeof form.title !== "string" ||
    typeof form.description !== "string" ||
    typeof form.difficulty !== "string" ||
    typeof form.recurrence !== "string" ||
    !Array.isArray(form.customDays)
  ) {
    return null;
  }

  return {
    title: form.title,
    description: form.description,
    difficulty: form.difficulty as HabitFormValues["difficulty"],
    recurrence: form.recurrence as HabitFormValues["recurrence"],
    customDays: form.customDays.filter((day): day is number => typeof day === "number"),
    stackAfter: typeof form.stackAfter === "string" ? form.stackAfter : "",
    stackAfterHabitId:
      typeof form.stackAfterHabitId === "string" && form.stackAfterHabitId
        ? form.stackAfterHabitId
        : null,
    cueTime: typeof form.cueTime === "string" && form.cueTime ? form.cueTime : null,
    cueContext: typeof form.cueContext === "string" ? form.cueContext : "",
    identityWhy: typeof form.identityWhy === "string" ? form.identityWhy : "",
    desiredFeeling: typeof form.desiredFeeling === "string" ? form.desiredFeeling : "",
    tinyVersion: typeof form.tinyVersion === "string" ? form.tinyVersion : "",
  };
}
