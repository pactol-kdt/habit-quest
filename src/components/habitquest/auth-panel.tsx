"use client";

import { useEffect, useState, useTransition } from "react";
import { signOutAction } from "~/app/actions/auth";
import { GlassCard } from "~/components/habitquest/glass-card";
import {
  flushCloudSaveNow,
  setCloudSyncEnabled,
  subscribeCloudSync,
  type CloudSyncStatus,
} from "~/lib/habitquest/cloud-sync";
import { clearHabitQuestData } from "~/lib/habitquest/storage";
import { useHabitQuestStore } from "~/store/habitquest-store";

export function AuthPanel() {
  const [error, setError] = useState<string | null>(null);
  const [liveSyncStatus, setLiveSyncStatus] = useState<CloudSyncStatus | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  const authUser = useHabitQuestStore((state) => state.authUser);
  const setAuthUser = useHabitQuestStore((state) => state.setAuthUser);
  const setAuthChecked = useHabitQuestStore((state) => state.setAuthChecked);
  const projectSave = useHabitQuestStore((state) => state.projectSave);

  const syncStatus: CloudSyncStatus = !authUser
    ? "guest"
    : (liveSyncStatus ?? "idle");

  useEffect(() => {
    return subscribeCloudSync((status, note) => {
      setLiveSyncStatus(status);
      setSyncMessage(note);
    });
  }, []);

  function onSignOut() {
    setError(null);
    startTransition(async () => {
      await flushCloudSaveNow(projectSave());
      await signOutAction();
      setCloudSyncEnabled(false);
      clearHabitQuestData();
      setAuthUser(null);
      setAuthChecked(true);
      setLiveSyncStatus(null);
    });
  }

  if (!authUser) {
    return null;
  }

  return (
    <GlassCard>
      <h2 className="section-title text-2xl text-white">Account & sync</h2>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        You must stay signed in to use HabitQuest. Progress syncs to your account database save.
      </p>

      <div className="mt-5 space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-sm text-white">{authUser.email}</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Sync:{" "}
            {syncStatus === "synced"
              ? "Up to date"
              : syncStatus === "syncing"
                ? "Saving…"
                : syncStatus === "error"
                  ? `Error${syncMessage ? `: ${syncMessage}` : ""}`
                  : "Ready"}
          </p>
        </div>

        <button
          type="button"
          disabled={pending}
          onClick={onSignOut}
          className="rounded-full border border-white/10 px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white disabled:opacity-60"
        >
          Sign out
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}
    </GlassCard>
  );
}
