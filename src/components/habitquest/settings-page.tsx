"use client";

import { useState } from "react";
import { GlassCard } from "~/components/habitquest/glass-card";
import { sendTestReminderNow } from "~/hooks/use-habitquest-reminders";
import {
  canFireBrowserReminder,
  getReminderPermission,
  requestReminderPermission,
} from "~/lib/habitquest/reminders";
import {
  disableHabitQuestReminders,
  enableHabitQuestReminders,
} from "~/lib/push/enable-reminders";
import {
  describePushReminderSchedule,
  formatReminderClockLabel,
  snapReminderTimeToHour,
} from "~/lib/push/timezone";
import { APP_VERSION } from "~/lib/app-version";
import { PAGE_HEROES } from "~/lib/habitquest/copy";
import { getDueHabitsForDate, getTodayDateKey } from "~/lib/habitquest/utils";
import { useHabitQuestStore } from "~/store/habitquest-store";

const isDev = process.env.NODE_ENV === "development";

const REMINDER_HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => {
  const value = `${String(hour).padStart(2, "0")}:00`;
  return { value, label: formatReminderClockLabel(value) };
});

export function SettingsPage() {
  const [devNote, setDevNote] = useState<string | null>(null);
  const [reminderNote, setReminderNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { hydrated, settings, updateSettings, habits } = useHabitQuestStore((state) => state);
  const hero = PAGE_HEROES.settings;

  if (!hydrated) {
    return (
      <div className="grid min-w-0 gap-4 pt-4 md:gap-6 md:pt-6">
        <div className="glass-panel h-48 animate-pulse rounded-[2rem]" />
      </div>
    );
  }

  async function handleDevTestNotification() {
    setBusy(true);
    setDevNote(null);
    try {
      let permission = getReminderPermission();
      if (permission === "default") {
        permission = await requestReminderPermission();
      }
      if (permission !== "granted") {
        setDevNote(
          permission === "unsupported"
            ? "This browser does not support notifications."
            : "Allow notifications in the browser prompt (or site settings), then try again.",
        );
        return;
      }

      const dueCount = getDueHabitsForDate(habits, getTodayDateKey()).length;
      const result = sendTestReminderNow(settings.displayName, dueCount);
      setDevNote(
        result.ok
          ? "Local test notification sent (does not need Web Push / FCM)."
          : result.error,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-4 pt-4 md:gap-6 md:pt-6">
      <GlassCard className="rounded-[1.75rem] p-4 md:rounded-[2rem] md:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
          {hero.eyebrow}
        </p>
        <h1 className="section-title mt-2 text-2xl text-white sm:text-4xl md:text-5xl">
          {hero.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)] md:text-base">
          {hero.support}
        </p>
      </GlassCard>

      <GlassCard>
        <h2 className="section-title text-2xl text-white">Daily reminder</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
          HabitQuest can remind you {describePushReminderSchedule(settings.reminderTime)}. Cue
          times on habits sort today&apos;s list — they are not alarms.
        </p>
        <label className="mt-5 grid gap-2">
          <span className="text-sm text-[var(--color-text-muted)]">Reminder time</span>
          <select
            value={snapReminderTimeToHour(settings.reminderTime)}
            onChange={(event) => {
              updateSettings({ reminderTime: event.target.value });
              setReminderNote(
                `Reminder set for ${formatReminderClockLabel(event.target.value)}.`,
              );
            }}
            className="max-w-xs rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-cyan-300/50"
          >
            {REMINDER_HOUR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-slate-950 text-white">
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setReminderNote(null);
            try {
              if (settings.remindersEnabled) {
                await disableHabitQuestReminders();
                setReminderNote("Reminders are off.");
                return;
              }
              const result = await enableHabitQuestReminders();
              setReminderNote(result.message);
            } finally {
              setBusy(false);
            }
          }}
          className="mt-5 min-h-11 rounded-full hq-btn-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
        >
          {busy
            ? "Working…"
            : settings.remindersEnabled
              ? "Turn reminders off"
              : "Turn reminders on"}
        </button>
        {reminderNote ? <p className="mt-3 text-sm text-cyan-100">{reminderNote}</p> : null}
      </GlassCard>

      {isDev ? (
        <GlassCard>
          <h2 className="section-title text-2xl text-white">Dev · Test notification</h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Development only. Uses a local browser notification (works even when Chrome blocks Web
            Push / FCM). Keep this tab open.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={handleDevTestNotification}
            className="mt-4 rounded-full hq-btn-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
          >
            {busy
              ? "Sending…"
              : canFireBrowserReminder()
                ? "Send local test notification"
                : "Allow + send local test notification"}
          </button>
          {devNote ? <p className="mt-3 text-sm text-cyan-100">{devNote}</p> : null}
        </GlassCard>
      ) : null}

      <GlassCard>
        <h2 className="section-title text-2xl text-white">About</h2>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          HabitQuest version{" "}
          <span className="font-medium text-white/90">v{APP_VERSION}</span>
        </p>
      </GlassCard>
    </div>
  );
}
