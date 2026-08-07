"use client";

import { useEffect, useState } from "react";
import { AuthPanel } from "~/components/habitquest/auth-panel";
import { GlassCard } from "~/components/habitquest/glass-card";
import {
  sendTestReminderNow,
  tryFireDueReminderNow,
} from "~/hooks/use-habitquest-reminders";
import {
  canFireBrowserReminder,
  getReminderPermission,
  requestReminderPermission,
} from "~/lib/habitquest/reminders";
import { getDueHabitsForDate, getTodayDateKey } from "~/lib/habitquest/utils";
import { useHabitQuestStore } from "~/store/habitquest-store";

export function SettingsPage() {
  const [permissionNote, setPermissionNote] = useState<string | null>(null);
  const [backupNote, setBackupNote] = useState<string | null>(null);
  const [permission, setPermission] = useState(getReminderPermission());

  const { hydrated, settings, updateSettings, projectSave, habits } = useHabitQuestStore(
    (state) => state,
  );

  useEffect(() => {
    setPermission(getReminderPermission());
  }, [settings.remindersEnabled]);

  if (!hydrated) {
    return (
      <div className="grid gap-4 pt-4 md:gap-6 md:pt-6">
        <div className="glass-panel h-48 animate-pulse rounded-[2rem]" />
      </div>
    );
  }

  async function handleEnableReminders() {
    const result = await requestReminderPermission();
    setPermission(getReminderPermission());
    if (result === "granted") {
      updateSettings({ remindersEnabled: true });
      const dueCount = getDueHabitsForDate(habits, getTodayDateKey()).length;
      const fired = tryFireDueReminderNow({
        reminderTime: settings.reminderTime,
        displayName: settings.displayName,
        dueCount,
      });
      setPermissionNote(
        fired
          ? "Enabled. A due reminder just fired (or was already sent today). Reminders only run while this tab stays open."
          : "Enabled. Reminders only fire while this HabitQuest tab stays open — not a background push service.",
      );
      return;
    }

    if (result === "unsupported") {
      setPermissionNote("This browser does not support notifications.");
      return;
    }

    updateSettings({ remindersEnabled: false });
    setPermissionNote(
      "Notification permission was denied. You can re-enable it in browser settings.",
    );
  }

  function handleTestReminder() {
    const dueCount = getDueHabitsForDate(habits, getTodayDateKey()).length;
    const result = sendTestReminderNow(settings.displayName, dueCount);
    setPermissionNote(
      result.ok
        ? "Test notification sent. If you did not see it, check OS focus/do-not-disturb and that this site is allowed."
        : result.error,
    );
  }

  function downloadSnapshot() {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        note: "Read-only snapshot for your records. HabitQuest restores from your signed-in account, not this file.",
        save: projectSave(),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      anchor.href = url;
      anchor.download = `habitquest-snapshot-${stamp}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setBackupNote("Snapshot downloaded. Your live progress still syncs from your account.");
    } catch {
      setBackupNote("Could not build a snapshot in this browser.");
    }
  }

  return (
    <div className="grid gap-4 pt-4 md:gap-6 md:pt-6">
      <GlassCard className="rounded-[1.75rem] p-4 md:rounded-[2rem] md:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
          Settings
        </p>
        <h1 className="section-title mt-2 text-2xl text-white sm:text-4xl md:text-5xl">
          Quest preferences
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)] md:text-base">
          HabitQuest requires an account. Progress lives in your database save — this page is for
          profile, reminders, and account sync status.
        </p>
      </GlassCard>

      <AuthPanel />

      <div className="grid gap-6 xl:grid-cols-2">
        <GlassCard>
          <h2 className="section-title text-2xl text-white">Profile</h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Display name appears in navigation and the dashboard greeting.
          </p>
          <label className="mt-5 grid gap-2">
            <span className="text-sm text-[var(--color-text-muted)]">Display name</span>
            <input
              value={settings.displayName}
              onChange={(event) => updateSettings({ displayName: event.target.value })}
              maxLength={32}
              placeholder="Adventurer"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-cyan-300/50"
            />
          </label>
        </GlassCard>

        <GlassCard>
          <h2 className="section-title text-2xl text-white">Daily reminder</h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Browser notifications only — they fire while this tab is open. Closing HabitQuest or
            sleeping the laptop means no reminder. True push notifications are not built yet.
          </p>
          <label className="mt-5 grid gap-2">
            <span className="text-sm text-[var(--color-text-muted)]">Reminder time</span>
            <input
              type="time"
              value={settings.reminderTime}
              onChange={(event) =>
                updateSettings({ reminderTime: event.target.value || "09:00" })
              }
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-cyan-300/50"
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleEnableReminders}
              className="rounded-full hq-btn-accent px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Enable while tab is open
            </button>
            <button
              type="button"
              onClick={handleTestReminder}
              disabled={!canFireBrowserReminder()}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send test notification
            </button>
            <button
              type="button"
              onClick={() => updateSettings({ remindersEnabled: false })}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-white"
            >
              Disable
            </button>
          </div>
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">
            Status:{" "}
            {settings.remindersEnabled
              ? permission === "granted"
                ? "Enabled (tab must stay open)"
                : `Enabled in settings, but browser permission is ${permission}`
              : "Disabled"}
          </p>
          {permissionNote ? (
            <p className="mt-2 text-sm text-cyan-100">{permissionNote}</p>
          ) : null}
        </GlassCard>
      </div>

      <GlassCard>
        <h2 className="section-title text-2xl text-white">Backup</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
          Your signed-in account is the source of truth. There is no import flow — downloading a
          JSON snapshot is only for your own records if you want a local copy.
        </p>
        <button
          type="button"
          onClick={downloadSnapshot}
          className="mt-5 rounded-full border border-white/10 px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
        >
          Download JSON snapshot
        </button>
        {backupNote ? <p className="mt-3 text-sm text-cyan-100">{backupNote}</p> : null}
      </GlassCard>
    </div>
  );
}
