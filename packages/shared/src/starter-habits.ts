import { createId } from "./utils";
import type { Habit, HabitQuestData } from "./types";

export const STARTER_HABIT_KEYS = ["stretch", "deep-work", "strength", "journal"] as const;

export type StarterHabitKey = (typeof STARTER_HABIT_KEYS)[number];

type StarterFields = Omit<Habit, "id" | "createdAt" | "updatedAt">;

export interface StarterHabitBlueprint {
  key: StarterHabitKey;
  label: string;
  fields: StarterFields;
}

const STARTER_HABIT_BLUEPRINTS: StarterHabitBlueprint[] = [
  {
    key: "stretch",
    label: "Stretch",
    fields: {
      title: "Morning stretch",
      description: "A five-minute mobility reset before opening anything else.",
      difficulty: "easy",
      recurrence: "daily",
      customDays: [],
      stackAfter: "I pour my coffee",
      stackAfterHabitId: null,
      cueTime: "07:30",
      cueContext: "Kitchen",
      identityWhy: "I'm someone who starts the day in my body",
      desiredFeeling: "Awake and loose",
      tinyVersion: "Reach for the ceiling once",
    },
  },
  {
    key: "deep-work",
    label: "Deep work",
    fields: {
      title: "Deep work sprint",
      description: "One focused 45-minute block on your most important task.",
      difficulty: "hard",
      recurrence: "daily",
      customDays: [],
      stackAfter: "I sit at my desk",
      stackAfterHabitId: null,
      cueTime: "09:00",
      cueContext: "Desk",
      identityWhy: "I'm someone who protects deep focus",
      desiredFeeling: "Clear and proud",
      tinyVersion: "Open the doc and write one sentence",
    },
  },
  {
    key: "strength",
    label: "Strength",
    fields: {
      title: "Strength training",
      description: "Short session to keep the body in the game.",
      difficulty: "medium",
      recurrence: "custom",
      customDays: [1, 3, 5],
      stackAfter: "I change into workout clothes",
      stackAfterHabitId: null,
      cueTime: "18:00",
      cueContext: "Gym or home floor",
      identityWhy: "I'm someone who trains even on busy weeks",
      desiredFeeling: "Strong and settled",
      tinyVersion: "Do ten bodyweight squats",
    },
  },
  {
    key: "journal",
    label: "Journal",
    fields: {
      title: "Journal recap",
      description: "Close the day with a short review and one improvement note.",
      difficulty: "easy",
      recurrence: "daily",
      customDays: [],
      stackAfter: "I brush my teeth",
      stackAfterHabitId: null,
      cueTime: "21:30",
      cueContext: "Bedside",
      identityWhy: "I'm someone who learns from the day",
      desiredFeeling: "Calm and complete",
      tinyVersion: "Write one line: what went well?",
    },
  },
];

export function getStarterHabitBlueprints() {
  return STARTER_HABIT_BLUEPRINTS;
}

export function isStarterHabitKey(value: unknown): value is StarterHabitKey {
  return typeof value === "string" && (STARTER_HABIT_KEYS as readonly string[]).includes(value);
}

export function parseStarterHabitKeys(values: unknown): StarterHabitKey[] | null {
  if (!Array.isArray(values)) {
    return null;
  }
  const keys: StarterHabitKey[] = [];
  for (const value of values) {
    if (!isStarterHabitKey(value) || keys.includes(value)) {
      continue;
    }
    keys.push(value);
  }
  return keys;
}

/**
 * Replace the unstarted habit list with the examples the person picked.
 * No-op once onboarding is done or any finish exists, so replays and existing runs stay put.
 */
export function selectStarterHabits(
  data: HabitQuestData,
  keys: readonly StarterHabitKey[],
  now = new Date().toISOString(),
): HabitQuestData {
  if (data.settings.onboardingCompleted || data.completions.length > 0) {
    return data;
  }

  const chosen = new Set(keys);
  const habits = getStarterHabitBlueprints()
    .filter((blueprint) => chosen.has(blueprint.key))
    .map((blueprint) => ({
      ...blueprint.fields,
      id: createId("habit"),
      createdAt: now,
      updatedAt: now,
    }));

  return {
    ...data,
    habits,
  };
}
