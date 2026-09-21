"use client";

import { useEffect, useRef, useState } from "react";
import { useDialogA11y } from "~/hooks/use-dialog-a11y";
import { getReminderPermission } from "~/lib/habitquest/reminders";
import { enableHabitQuestReminders } from "~/lib/push/enable-reminders";
import { describePushReminderSchedule } from "~/lib/push/timezone";
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
  const completions = useHabitQuestStore((state) => state.completions);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const schedule = describePushReminderSchedule();
  const hasCleared = completions.length > 0;

  useDialogA11y(
    panelRef,
    () => {
      markDismissed();
      setOpen(false);
    },
    open,
  );

  useEffect(() => {
    if (!hydrated || !authUser) {
      setOpen(false);
      return;
    }

    const permission = getReminderPermission();
    if (permission !== "default" || remindersEnabled || wasDismissed() || !hasCleared) {
      setOpen(false);
      return;
    }

    setOpen(true);
  }, [authUser, hasCleared, hydrated, remindersEnabled]);

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
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/70 p-4 sm:items-center"
      onClick={handleLater}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reminder-prompt-title"
        tabIndex={-1}
        className="glass-panel w-full max-w-md rounded-[1.75rem] p-5 outline-none md:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
          Daily reminder
        </p>
        <h2 id="reminder-prompt-title" className="section-title mt-2 text-2xl text-white">
          Want a nudge for tomorrow?
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
          HabitQuest can remind you {schedule}. You can change this later in Settings.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={handleAllow}
            className="rounded-full hq-btn-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
          >
            {busy ? "Asking…" : "Yes, remind me"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleLater}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-white disabled:opacity-60"
          >
            Not now
          </button>
        </div>
        {note ? <p className="mt-3 text-sm text-cyan-100">{note}</p> : null}
      </div>
    </div>
  );
}
