"use client";

import { useEffect, useState } from "react";
import {
  removePushSubscriptionAction,
  savePushSubscriptionAction,
  sendTestPushAction,
} from "~/app/actions/push";
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
import {
  canUseWebPush,
  getPushClientStatus,
  getVapidPublicKeyFromEnv,
  subscribeToHabitQuestPush,
  unsubscribeFromHabitQuestPush,
} from "~/lib/push/client";
import { getDueHabitsForDate, getTodayDateKey } from "~/lib/habitquest/utils";
import { useHabitQuestStore } from "~/store/habitquest-store";

export function SettingsPage() {
  const [permissionNote, setPermissionNote] = useState<string | null>(null);
  const [backupNote, setBackupNote] = useState<string | null>(null);
  const [permission, setPermission] = useState(getReminderPermission());
  const [pushStatus, setPushStatus] = useState<string>("checking");
  const [busy, setBusy] = useState(false);

  const { hydrated, settings, updateSettings, projectSave, habits } = useHabitQuestStore(
    (state) => state,
  );
  const [displayNameDraft, setDisplayNameDraft] = useState(settings.displayName);

  useEffect(() => {
    setPermission(getReminderPermission());
  }, [settings.remindersEnabled]);

  useEffect(() => {
    setDisplayNameDraft(settings.displayName);
  }, [settings.displayName]);

  useEffect(() => {
    let cancelled = false;
    void getPushClientStatus().then((status) => {
      if (!cancelled) {
        setPushStatus(status);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [settings.remindersEnabled, permission]);

  function commitDisplayName() {
    const next = displayNameDraft.trim().slice(0, 32);
    setDisplayNameDraft(next);
    if (next === settings.displayName) {
      return;
    }
    updateSettings({ displayName: next });
  }

  if (!hydrated) {
    return (
      <div className="grid gap-4 pt-4 md:gap-6 md:pt-6">
        <div className="glass-panel h-48 animate-pulse rounded-[2rem]" />
      </div>
    );
  }

  async function handleEnableReminders() {
    setBusy(true);
    setPermissionNote(null);
    try {
      const permissionResult = await requestReminderPermission();
      setPermission(getReminderPermission());

      if (permissionResult === "unsupported") {
        setPermissionNote("This browser does not support notifications.");
        return;
      }

      if (permissionResult !== "granted") {
        updateSettings({ remindersEnabled: false });
        setPermissionNote(
          "Notification permission was denied. You can re-enable it in browser settings.",
        );
        return;
      }

      updateSettings({ remindersEnabled: true });

      let pushNote =
        "Enabled. Background push needs a push-capable browser (Chrome/Edge/Firefox) plus VAPID keys on the server.";

      if (canUseWebPush() && getVapidPublicKeyFromEnv()) {
        const subscribed = await subscribeToHabitQuestPush();
        if (subscribed.status === "subscribed" && subscribed.subscription?.endpoint) {
          const saved = await savePushSubscriptionAction(
            {
              endpoint: subscribed.subscription.endpoint,
              keys: {
                p256dh: subscribed.subscription.keys?.p256dh,
                auth: subscribed.subscription.keys?.auth,
              },
            },
            subscribed.timeZone,
          );
          if (saved.status === "ok") {
            setPushStatus("subscribed");
            pushNote =
              "Enabled. Push reminders can fire even when HabitQuest is closed (server cron every ~5 min).";
          } else if (saved.status === "not_configured") {
            pushNote = `Enabled for this tab. ${saved.error}`;
          } else if (saved.status === "error") {
            pushNote = `Enabled for this tab. Push subscribe failed: ${saved.error}`;
          }
        } else if (subscribed.status === "push_service_error") {
          setPushStatus("push_service_error");
          pushNote = `Enabled for this tab. Push blocked: ${subscribed.error}`;
        } else if (subscribed.status === "missing-vapid") {
          pushNote =
            "Enabled for this tab. Add NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY to enable background push.";
        } else if (subscribed.status === "unsupported") {
          pushNote =
            "Enabled for this tab. This browser cannot register a push service worker.";
        }
      }

      const dueCount = getDueHabitsForDate(habits, getTodayDateKey()).length;
      tryFireDueReminderNow({
        reminderTime: settings.reminderTime,
        displayName: settings.displayName,
        dueCount,
      });
      setPermissionNote(pushNote);
    } finally {
      setBusy(false);
    }
  }

  async function handleDisableReminders() {
    setBusy(true);
    try {
      updateSettings({ remindersEnabled: false });
      const unsubscribed = await unsubscribeFromHabitQuestPush();
      await removePushSubscriptionAction(unsubscribed.endpoint);
      setPushStatus(await getPushClientStatus());
      setPermissionNote("Reminders disabled and push subscription removed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleTestReminder() {
    setBusy(true);
    setPermissionNote(null);
    try {
      const pushResult = await sendTestPushAction();
      if (pushResult.status === "ok" && pushResult.sent > 0) {
        setPermissionNote(
          `Push test sent to ${pushResult.sent} device${pushResult.sent === 1 ? "" : "s"}. Check your notification shade — HabitQuest does not need to stay open.`,
        );
        return;
      }

      const dueCount = getDueHabitsForDate(habits, getTodayDateKey()).length;
      const local = sendTestReminderNow(settings.displayName, dueCount);
      if (local.ok) {
        const extra =
          pushResult.status === "error" || pushResult.status === "not_configured"
            ? ` (push: ${pushResult.error})`
            : pushResult.status === "ok"
              ? " (no saved push subscription — showed a local notification instead)"
              : "";
        setPermissionNote(`Local test notification sent.${extra}`);
        return;
      }

      setPermissionNote(
        pushResult.status === "error" || pushResult.status === "not_configured"
          ? pushResult.error
          : local.error,
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

  const pushLabel =
    pushStatus === "subscribed"
      ? "Push subscribed"
      : pushStatus === "missing-vapid"
        ? "Push keys missing"
        : pushStatus === "unsupported"
          ? "Push unsupported here"
          : pushStatus === "denied"
            ? "Permission denied"
            : pushStatus === "unsubscribed"
              ? "Not subscribed to push"
              : pushStatus === "push_service_error"
                ? "Push service unreachable"
                : pushStatus === "default"
                  ? "Permission not asked"
                  : "Checking push…";

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

        <GlassCard>
          <h2 className="section-title text-2xl text-white">Daily reminder</h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Enable once to allow OS notifications. HabitQuest registers a push subscription so
            reminders can arrive on your phone even when the tab is closed. Needs HTTPS (or
            localhost) and a scheduled cron hit to{" "}
            <code className="text-cyan-100">/api/cron/reminders</code>.
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
              disabled={busy}
              onClick={handleEnableReminders}
              className="rounded-full hq-btn-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
            >
              Enable push reminders
            </button>
            <button
              type="button"
              disabled={busy || !canFireBrowserReminder()}
              onClick={handleTestReminder}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send test notification
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleDisableReminders}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-white disabled:opacity-60"
            >
              Disable
            </button>
          </div>
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">
            Status:{" "}
            {settings.remindersEnabled
              ? permission === "granted"
                ? `Enabled · ${pushLabel}`
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
