"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "~/components/habitquest/glass-card";
import { getReminderPermission } from "~/lib/habitquest/reminders";
import { enableHabitQuestReminders } from "~/lib/push/enable-reminders";
import { useHabitQuestStore } from "~/store/habitquest-store";

const DISMISS_KEY = "habitquest::notification-prompt-dismissed";

function wasDismissed() {
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    window.sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Ignore.
  }
}

export function NotificationPermissionPrompt() {
  const hydrated = useHabitQuestStore((state) => state.hydrated);
  const authUser = useHabitQuestStore((state) => state.authUser);
  const remindersEnabled = useHabitQuestStore((state) => state.settings.remindersEnabled);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated || !authUser) {
      setOpen(false);
      return;
    }

    const permission = getReminderPermission();
    // Only prompt when the browser has not decided yet and reminders aren't already on.
    if (permission !== "default" || remindersEnabled || wasDismissed()) {
      setOpen(false);
      return;
    }

    setOpen(true);
  }, [authUser, hydrated, remindersEnabled]);

  if (!open) {
    return null;
  }

  async function handleAllow() {
    setBusy(true);
    setNote(null);
    try {
      const result = await enableHabitQuestReminders();
      setNote(result.message);
      if (result.permission === "granted" || result.permission === "denied") {
        markDismissed();
        // Keep the note visible briefly, then close.
        window.setTimeout(() => setOpen(false), 1600);
      }
    } finally {
      setBusy(false);
    }
  }

  function handleLater() {
    markDismissed();
    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/70 p-4 sm:items-center">
      <GlassCard className="w-full max-w-md rounded-[1.75rem] p-5 md:p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
          A quiet call
        </p>
        <h2 className="section-title mt-2 text-2xl text-white">Shall we wake you at dawn?</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
          Around <span className="text-cyan-100">8:00 local time</span>, HabitQuest can gently
          remind you that habits await. You can change this later in your browser settings.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={handleAllow}
            className="rounded-full hq-btn-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
          >
            {busy ? "Asking…" : "Yes, wake me"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleLater}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-white disabled:opacity-60"
          >
            Not tonight
          </button>
        </div>
        {note ? <p className="mt-3 text-sm text-cyan-100">{note}</p> : null}
      </GlassCard>
    </div>
  );
}
