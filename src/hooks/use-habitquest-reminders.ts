"use client";

import { useEffect } from "react";
import { savePushSubscriptionAction } from "~/app/actions/push";
import {
  canFireBrowserReminder,
  fireDailyReminder,
  fireHabitCueReminder,
  hasHabitReminderFiredToday,
  hasReminderFiredToday,
  markHabitReminderFiredToday,
  markReminderFiredToday,
  resolveDigestReminderTime,
  shouldFireReminder,
} from "~/lib/habitquest/reminders";
import { describeStackFormula } from "~/lib/habitquest/habit-loop";
import {
  canUseWebPush,
  getVapidPublicKeyFromEnv,
  subscribeToHabitQuestPush,
} from "~/lib/push/client";
import { getDueHabitsForDate, getTodayDateKey, hasCompletionForDate } from "~/lib/habitquest/utils";
import { useHabitQuestStore } from "~/store/habitquest-store";

function tryFireReminders(input: {
  displayName: string;
  habits: ReturnType<typeof useHabitQuestStore.getState>["habits"];
  completions: ReturnType<typeof useHabitQuestStore.getState>["completions"];
}) {
  if (!canFireBrowserReminder()) {
    return false;
  }

  const today = getTodayDateKey();
  const dueHabits = getDueHabitsForDate(input.habits, today);
  const incomplete = dueHabits.filter(
    (habit) => !hasCompletionForDate(input.completions, habit.id, today),
  );
  if (!incomplete.length) {
    return false;
  }

  let firedAny = false;

  for (const habit of incomplete) {
    if (!habit.cueTime) {
      continue;
    }
    if (hasHabitReminderFiredToday(today, habit.id)) {
      continue;
    }
    if (!shouldFireReminder(habit.cueTime)) {
      continue;
    }
    if (fireHabitCueReminder(input.displayName, habit, input.habits)) {
      markHabitReminderFiredToday(today, habit.id);
      firedAny = true;
    }
  }

  if (!hasReminderFiredToday(today)) {
    const digestTime = resolveDigestReminderTime(incomplete);
    if (shouldFireReminder(digestTime)) {
      const stackHint =
        describeStackFormula(incomplete[0]!, input.habits) ??
        incomplete.find((habit) => habit.stackAfter.trim())?.stackAfter ??
        null;
      const fired = fireDailyReminder(input.displayName, incomplete.length, stackHint);
      if (fired) {
        markReminderFiredToday(today);
        firedAny = true;
      }
    }
  }

  return firedAny;
}

export function useHabitQuestReminders() {
  const hydrated = useHabitQuestStore((state) => state.hydrated);
  const authUser = useHabitQuestStore((state) => state.authUser);
  const remindersEnabled = useHabitQuestStore((state) => state.settings.remindersEnabled);
  const displayName = useHabitQuestStore((state) => state.settings.displayName);
  const habits = useHabitQuestStore((state) => state.habits);
  const completions = useHabitQuestStore((state) => state.completions);

  useEffect(() => {
    if (!hydrated || !remindersEnabled || !authUser) {
      return;
    }
    if (!canUseWebPush() || !getVapidPublicKeyFromEnv()) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const subscribed = await subscribeToHabitQuestPush();
        if (cancelled || subscribed.status !== "subscribed" || !subscribed.subscription?.endpoint) {
          return;
        }
        await savePushSubscriptionAction(
          {
            endpoint: subscribed.subscription.endpoint,
            keys: {
              p256dh: subscribed.subscription.keys?.p256dh,
              auth: subscribed.subscription.keys?.auth,
            },
          },
          subscribed.timeZone,
        );
      } catch {
        // Push is best-effort — never crash the app shell if FCM/push service fails.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authUser, hydrated, remindersEnabled]);

  useEffect(() => {
    if (!hydrated || !remindersEnabled) {
      return;
    }

    function tick() {
      tryFireReminders({ displayName, habits, completions });
    }

    tick();
    const intervalId = window.setInterval(tick, 30_000);
    return () => window.clearInterval(intervalId);
  }, [completions, displayName, habits, hydrated, remindersEnabled]);
}

/** Used by Settings "Send test" — bypasses once-per-day gate. */
export function sendTestReminderNow(displayName: string, dueCount: number) {
  if (!canFireBrowserReminder()) {
    return { ok: false as const, error: "Browser notification permission is not granted." };
  }
  const fired = fireDailyReminder(displayName, dueCount, "After coffee, I will stretch");
  if (!fired) {
    return {
      ok: false as const,
      error: "Could not show a notification. Keep this tab open and check OS notification settings.",
    };
  }
  return { ok: true as const };
}

export function tryFireDueReminderNow(input: {
  reminderTime?: string;
  displayName: string;
  dueCount: number;
}) {
  const state = useHabitQuestStore.getState();
  return tryFireReminders({
    displayName: input.displayName,
    habits: state.habits,
    completions: state.completions,
  });
}
