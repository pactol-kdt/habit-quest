import type { Habit, HabitFormValues } from "~/types/habitquest";

export const EMPTY_HABIT_LOOP_FIELDS = {
  stackAfter: "",
  stackAfterHabitId: null as string | null,
  cueTime: null as string | null,
  cueContext: "",
  identityWhy: "",
  desiredFeeling: "",
  tinyVersion: "",
};

export function defaultHabitLoopFields() {
  return { ...EMPTY_HABIT_LOOP_FIELDS };
}

export function normalizeCueTime(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function cueTimeToMinutes(cueTime: string | null | undefined): number | null {
  const normalized = normalizeCueTime(cueTime);
  if (!normalized) {
    return null;
  }
  const [hours, minutes] = normalized.split(":").map(Number);
  return hours! * 60 + minutes!;
}

export function normalizeHabitRecord(habit: Partial<Habit> & Pick<Habit, "id" | "title">): Habit {
  const stackAfterHabitId =
    typeof habit.stackAfterHabitId === "string" && habit.stackAfterHabitId.trim()
      ? habit.stackAfterHabitId.trim()
      : null;

  return {
    id: habit.id,
    title: habit.title,
    description: typeof habit.description === "string" ? habit.description : "",
    difficulty: habit.difficulty === "medium" || habit.difficulty === "hard" ? habit.difficulty : "easy",
    recurrence:
      habit.recurrence === "weekly" || habit.recurrence === "custom" ? habit.recurrence : "daily",
    customDays: Array.isArray(habit.customDays)
      ? habit.customDays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
      : [],
    stackAfter: typeof habit.stackAfter === "string" ? habit.stackAfter.trim() : "",
    stackAfterHabitId,
    cueTime: normalizeCueTime(habit.cueTime),
    cueContext: typeof habit.cueContext === "string" ? habit.cueContext.trim() : "",
    identityWhy: typeof habit.identityWhy === "string" ? habit.identityWhy.trim() : "",
    desiredFeeling: typeof habit.desiredFeeling === "string" ? habit.desiredFeeling.trim() : "",
    tinyVersion: typeof habit.tinyVersion === "string" ? habit.tinyVersion.trim() : "",
    createdAt: typeof habit.createdAt === "string" ? habit.createdAt : new Date().toISOString(),
    updatedAt: typeof habit.updatedAt === "string" ? habit.updatedAt : new Date().toISOString(),
  };
}

export function normalizeHabitLoopFormFields(
  values: Pick<
    HabitFormValues,
    | "stackAfter"
    | "stackAfterHabitId"
    | "cueTime"
    | "cueContext"
    | "identityWhy"
    | "desiredFeeling"
    | "tinyVersion"
  >,
) {
  const stackAfterHabitId =
    typeof values.stackAfterHabitId === "string" && values.stackAfterHabitId.trim()
      ? values.stackAfterHabitId.trim()
      : null;

  return {
    stackAfter: values.stackAfter.trim(),
    stackAfterHabitId,
    cueTime: normalizeCueTime(values.cueTime),
    cueContext: values.cueContext.trim(),
    identityWhy: values.identityWhy.trim(),
    desiredFeeling: values.desiredFeeling.trim(),
    tinyVersion: values.tinyVersion.trim(),
  };
}

/** "After coffee, I will stretch" — stacking is the hero trigger. */
export function describeStackFormula(habit: Habit, allHabits: Habit[] = []) {
  const anchorHabit = habit.stackAfterHabitId
    ? allHabits.find((entry) => entry.id === habit.stackAfterHabitId)
    : null;
  const after = anchorHabit?.title.trim() || habit.stackAfter.trim();
  if (!after) {
    return null;
  }
  return `After ${after}, I will ${habit.title.trim() || "…"}`;
}

export function describeHabitCue(habit: Habit) {
  const parts: string[] = [];
  if (habit.cueTime) {
    parts.push(habit.cueTime);
  }
  if (habit.cueContext.trim()) {
    parts.push(habit.cueContext.trim());
  }
  return parts.length ? parts.join(" · ") : null;
}

export function describeCraving(habit: Habit) {
  if (habit.desiredFeeling.trim()) {
    return habit.desiredFeeling.trim();
  }
  if (habit.identityWhy.trim()) {
    return habit.identityWhy.trim();
  }
  return null;
}

export function sortHabitsByLoop(
  habits: Habit[],
  options?: { completedIds?: ReadonlySet<string> },
): Habit[] {
  const byId = new Map(habits.map((habit) => [habit.id, habit] as const));
  const completedIds = options?.completedIds;

  function stackDepth(habit: Habit, seen = new Set<string>()): number {
    if (!habit.stackAfterHabitId || seen.has(habit.id)) {
      return 0;
    }
    seen.add(habit.id);
    const parent = byId.get(habit.stackAfterHabitId);
    if (!parent) {
      return 0;
    }
    return 1 + stackDepth(parent, seen);
  }

  return [...habits].sort((left, right) => {
    if (completedIds) {
      const leftDone = completedIds.has(left.id);
      const rightDone = completedIds.has(right.id);
      if (leftDone !== rightDone) {
        return leftDone ? 1 : -1;
      }
    }

    const leftCue = cueTimeToMinutes(left.cueTime);
    const rightCue = cueTimeToMinutes(right.cueTime);
    const leftScore = leftCue ?? Number.MAX_SAFE_INTEGER;
    const rightScore = rightCue ?? Number.MAX_SAFE_INTEGER;
    if (leftScore !== rightScore) {
      return leftScore - rightScore;
    }

    const depthDiff = stackDepth(left) - stackDepth(right);
    if (depthDiff !== 0) {
      return depthDiff;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

/** Earliest cue among habits that have one; null if none. */
export function getEarliestCueTime(habits: Habit[]): string | null {
  let best: { minutes: number; time: string } | null = null;
  for (const habit of habits) {
    const minutes = cueTimeToMinutes(habit.cueTime);
    if (minutes === null || !habit.cueTime) {
      continue;
    }
    if (!best || minutes < best.minutes) {
      best = { minutes, time: habit.cueTime };
    }
  }
  return best?.time ?? null;
}

export function clearBrokenStackLinks(habits: Habit[], removedHabitId: string): Habit[] {
  return habits.map((habit) =>
    habit.stackAfterHabitId === removedHabitId
      ? { ...habit, stackAfterHabitId: null, updatedAt: new Date().toISOString() }
      : habit,
  );
}

/** Another habit already claims this anchor as its stack parent (chains are 1→1). */
export function findStackFollower(
  habits: Habit[],
  anchorId: string,
  exceptHabitId?: string | null,
): Habit | null {
  return (
    habits.find(
      (habit) =>
        habit.stackAfterHabitId === anchorId &&
        habit.id !== exceptHabitId,
    ) ?? null
  );
}

export function canLinkStackAfter(
  habits: Habit[],
  anchorId: string,
  editingHabitId?: string | null,
): boolean {
  return findStackFollower(habits, anchorId, editingHabitId) == null;
}

/** True if linking habitId → parentId would cycle (A after B after A…). */
export function wouldCreateStackCycle(
  habits: Habit[],
  habitId: string,
  parentId: string,
): boolean {
  let current: string | null = parentId;
  const seen = new Set<string>();
  while (current) {
    if (current === habitId) {
      return true;
    }
    if (seen.has(current)) {
      return true;
    }
    seen.add(current);
    current = habits.find((habit) => habit.id === current)?.stackAfterHabitId ?? null;
  }
  return false;
}

/**
 * Next in a chain: anchor cleared, this habit open, and if legacy branches exist,
 * only the earliest follower by cue/stack order gets focus.
 */
export function isNextInStack(
  habit: Habit,
  habits: Habit[],
  completedHabitIds: Set<string>,
): boolean {
  if (!habit.stackAfterHabitId || completedHabitIds.has(habit.id)) {
    return false;
  }
  if (!completedHabitIds.has(habit.stackAfterHabitId)) {
    return false;
  }

  const openFollowers = habits.filter(
    (entry) =>
      entry.stackAfterHabitId === habit.stackAfterHabitId &&
      !completedHabitIds.has(entry.id),
  );
  const primary = sortHabitsByLoop(openFollowers)[0];
  return primary?.id === habit.id;
}
