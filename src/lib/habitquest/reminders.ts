import {
  buildDailyReminderCopy,
  buildHabitCueReminderCopy,
} from "~/lib/habitquest/reminder-copy";
import { describeStackFormula, getEarliestCueTime } from "~/lib/habitquest/habit-loop";
import type { Habit } from "~/types/habitquest";

const DIGEST_FALLBACK_TIME = "08:00";

const REMINDER_FIRED_KEY = "habitquest::reminder-fired";
const HABIT_REMINDER_FIRED_KEY = "habitquest::habit-reminder-fired";

export type ReminderPermission = "granted" | "denied" | "unsupported" | "default";

export function getReminderPermission(): ReminderPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "granted") {
    return "granted";
  }
  if (Notification.permission === "denied") {
    return "denied";
  }
  return "default";
}

export function canFireBrowserReminder() {
  return getReminderPermission() === "granted";
}

export async function requestReminderPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported" as const;
  }

  if (Notification.permission === "granted") {
    return "granted" as const;
  }

  if (Notification.permission === "denied") {
    return "denied" as const;
  }

  const permission = await Notification.requestPermission();
  return permission === "granted" ? ("granted" as const) : ("denied" as const);
}

export function getReminderFiredKey(dateKey: string) {
  return `${REMINDER_FIRED_KEY}::${dateKey}`;
}

export function getHabitReminderFiredKey(dateKey: string, habitId: string) {
  return `${HABIT_REMINDER_FIRED_KEY}::${dateKey}::${habitId}`;
}

export function hasReminderFiredToday(dateKey: string) {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    return window.localStorage.getItem(getReminderFiredKey(dateKey)) === "1";
  } catch {
    return true;
  }
}

export function hasHabitReminderFiredToday(dateKey: string, habitId: string) {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    return window.localStorage.getItem(getHabitReminderFiredKey(dateKey, habitId)) === "1";
  } catch {
    return true;
  }
}

export function markReminderFiredToday(dateKey: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getReminderFiredKey(dateKey), "1");
  } catch {
    // Ignore storage errors.
  }
}

export function markHabitReminderFiredToday(dateKey: string, habitId: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getHabitReminderFiredKey(dateKey, habitId), "1");
  } catch {
    // Ignore storage errors.
  }
}

export function shouldFireReminder(reminderTime: string, now = new Date()) {
  const [hoursRaw, minutesRaw] = reminderTime.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return false;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = hours * 60 + minutes;
  return currentMinutes >= targetMinutes;
}

export function fireDailyReminder(
  displayName: string,
  dueCount: number,
  stackHint?: string | null,
) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  const { title, body } = buildDailyReminderCopy(displayName, dueCount, stackHint);

  try {
    new Notification(title, {
      body,
      tag: "habitquest-daily-reminder",
    });
    return true;
  } catch {
    return false;
  }
}

export function fireHabitCueReminder(
  displayName: string,
  habit: Habit,
  allHabits: Habit[],
) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  const stackLine = describeStackFormula(habit, allHabits);
  const { title, body } = buildHabitCueReminderCopy(displayName, habit.title, stackLine);

  try {
    new Notification(title, {
      body,
      tag: `habitquest-habit-reminder-${habit.id}`,
    });
    return true;
  } catch {
    return false;
  }
}

/** Digest time: earliest due cue, else fixed 08:00. */
export function resolveDigestReminderTime(dueHabits: Habit[]) {
  return getEarliestCueTime(dueHabits) ?? DIGEST_FALLBACK_TIME;
}
