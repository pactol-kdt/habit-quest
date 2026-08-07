"use client";

import { useState } from "react";
import { AuthPanel } from "~/components/habitquest/auth-panel";
import { GlassCard } from "~/components/habitquest/glass-card";
import { requestReminderPermission } from "~/lib/habitquest/reminders";
import { useHabitQuestStore } from "~/store/habitquest-store";

export function SettingsPage() {
  const [permissionNote, setPermissionNote] = useState<string | null>(null);

  const { hydrated, settings, updateSettings } = useHabitQuestStore((state) => state);

  if (!hydrated) {
    return (
      <div className="grid gap-4 pt-4 md:gap-6 md:pt-6">
        <div className="glass-panel h-48 animate-pulse rounded-[2rem]" />
      </div>
    );
  }

  async function handleEnableReminders() {
    const result = await requestReminderPermission();
    if (result === "granted") {
      updateSettings({ remindersEnabled: true });
      setPermissionNote(
        "Browser notifications enabled. HabitQuest will nudge you at the daily reminder time while this tab is open.",
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
          HabitQuest requires an account. Manage sync, profile, and reminders here.
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
            Uses the browser Notification API while HabitQuest is open. Full push delivery needs a
            future backend.
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
              Enable notifications
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
            Status: {settings.remindersEnabled ? "Enabled" : "Disabled"}
          </p>
          {permissionNote ? (
            <p className="mt-2 text-sm text-cyan-100">{permissionNote}</p>
          ) : null}
        </GlassCard>
      </div>
    </div>
  );
}
