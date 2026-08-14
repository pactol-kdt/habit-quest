"use client";

import { useEffect, useState } from "react";
import { AuthPanel } from "~/components/habitquest/auth-panel";
import { GlassCard } from "~/components/habitquest/glass-card";
import { sendTestReminderNow } from "~/hooks/use-habitquest-reminders";
import {
  canFireBrowserReminder,
  getReminderPermission,
  requestReminderPermission,
} from "~/lib/habitquest/reminders";
import { APP_VERSION } from "~/lib/app-version";
import { getDueHabitsForDate, getTodayDateKey } from "~/lib/habitquest/utils";
import { useHabitQuestStore } from "~/store/habitquest-store";

const isDev = process.env.NODE_ENV === "development";

export function SettingsPage() {
  const [backupNote, setBackupNote] = useState<string | null>(null);
  const [devNote, setDevNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { hydrated, settings, updateSettings, projectSave, habits } = useHabitQuestStore(
    (state) => state,
  );
  const [displayNameDraft, setDisplayNameDraft] = useState(settings.displayName);

  useEffect(() => {
    setDisplayNameDraft(settings.displayName);
  }, [settings.displayName]);

  if (!hydrated) {
    return (
      <div className="grid gap-4 pt-4 md:gap-6 md:pt-6">
        <div className="glass-panel h-48 animate-pulse rounded-[2rem]" />
      </div>
    );
  }

  function commitDisplayName() {
    const next = displayNameDraft.trim().slice(0, 32);
    setDisplayNameDraft(next);
    if (next === settings.displayName) {
      return;
    }
    updateSettings({ displayName: next });
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
          Traveler preferences
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)] md:text-base">
          Your account holds the journey. Here you can shape your name and keep your sync steady.
        </p>
      </GlassCard>

      <AuthPanel />

      <GlassCard>
        <h2 className="section-title text-2xl text-white">Profile</h2>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Display name appears in navigation and the dashboard greeting.
        </p>
        <label className="mt-5 grid gap-2">
          <span className="text-sm text-[var(--color-text-muted)]">Display name</span>
          <input
            value={displayNameDraft}
            onChange={(event) => setDisplayNameDraft(event.target.value.slice(0, 32))}
            onBlur={commitDisplayName}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
            maxLength={32}
            placeholder="Adventurer"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-cyan-300/50"
          />
        </label>
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
