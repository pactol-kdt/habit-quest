"use client";

import { useEffect } from "react";
import {
  fireDailyReminder,
  hasReminderFiredToday,
  markReminderFiredToday,
  shouldFireReminder,
} from "~/lib/habitquest/reminders";
import { getDueHabitsForDate, getTodayDateKey } from "~/lib/habitquest/utils";
import { useHabitQuestStore } from "~/store/habitquest-store";

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
      if (hasReminderFiredToday(today)) {
        return;
      }

      if (!shouldFireReminder(reminderTime)) {
        return;
      }

      const dueCount = getDueHabitsForDate(habits, today).length;
      const fired = fireDailyReminder(displayName, dueCount);
      if (fired) {
        markReminderFiredToday(today);
      }
    }

    tick();
    const intervalId = window.setInterval(tick, 60_000);
    return () => window.clearInterval(intervalId);
  }, [displayName, habits, hydrated, reminderTime, remindersEnabled]);
}
