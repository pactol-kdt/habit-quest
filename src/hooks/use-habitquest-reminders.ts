"use client";

import { useEffect } from "react";
import {
  canFireBrowserReminder,
  fireDailyReminder,
  hasReminderFiredToday,
  markReminderFiredToday,
  shouldFireReminder,
} from "~/lib/habitquest/reminders";
import { getDueHabitsForDate, getTodayDateKey } from "~/lib/habitquest/utils";
import { useHabitQuestStore } from "~/store/habitquest-store";

function tryFireReminder(input: {
  reminderTime: string;
  displayName: string;
  dueCount: number;
}) {
  if (!canFireBrowserReminder()) {
    return false;
  }

  const today = getTodayDateKey();
  if (hasReminderFiredToday(today)) {
    return false;
  }
  if (!shouldFireReminder(input.reminderTime)) {
    return false;
  }

  const fired = fireDailyReminder(input.displayName, input.dueCount);
  if (fired) {
    markReminderFiredToday(today);
  }
  return fired;
}

export function useHabitQuestReminders() {
  const hydrated = useHabitQuestStore((state) => state.hydrated);
  const remindersEnabled = useHabitQuestStore((state) => state.settings.remindersEnabled);
  const reminderTime = useHabitQuestStore((state) => state.settings.reminderTime);
  const displayName = useHabitQuestStore((state) => state.settings.displayName);
  const habits = useHabitQuestStore((state) => state.habits);

  useEffect(() => {
    if (!hydrated || !remindersEnabled) {
      return;
    }

    function tick() {
      const today = getTodayDateKey();
      const dueCount = getDueHabitsForDate(habits, today).length;
      tryFireReminder({ reminderTime, displayName, dueCount });
    }

    tick();
    const intervalId = window.setInterval(tick, 30_000);
    return () => window.clearInterval(intervalId);
  }, [displayName, habits, hydrated, reminderTime, remindersEnabled]);
}

/** Used by Settings "Send test" — bypasses once-per-day gate. */
export function sendTestReminderNow(displayName: string, dueCount: number) {
  if (!canFireBrowserReminder()) {
    return { ok: false as const, error: "Browser notification permission is not granted." };
  }
  const fired = fireDailyReminder(displayName, dueCount);
  if (!fired) {
    return {
      ok: false as const,
      error: "Could not show a notification. Keep this tab open and check OS notification settings.",
    };
  }
  return { ok: true as const };
}

export function tryFireDueReminderNow(input: {
  reminderTime: string;
  displayName: string;
  dueCount: number;
}) {
  return tryFireReminder(input);
}
