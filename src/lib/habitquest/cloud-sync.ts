"use client";

import type { HabitQuestData } from "~/types/habitquest";

export type CloudSyncStatus = "guest" | "idle" | "syncing" | "synced" | "error";

type SyncListener = (status: CloudSyncStatus, message?: string) => void;

const listeners = new Set<SyncListener>();
let syncEnabled = false;

export function setCloudSyncEnabled(enabled: boolean) {
  syncEnabled = enabled;
  emit(enabled ? "idle" : "guest");
}

function emit(status: CloudSyncStatus, message?: string) {
  listeners.forEach((listener) => listener(status, message));
}

export function subscribeCloudSync(listener: SyncListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Full-document cloud push has been removed for signed-in play.
 * Commands return GamePatch responses instead. These stubs keep callers compiling.
 */
export function bumpCloudSavePayload(_data: HabitQuestData) {
  // no-op — patches are authoritative
}

export function scheduleCloudSave(_data: HabitQuestData) {
  // no-op
}

export async function flushCloudSaveNow(_data?: HabitQuestData) {
  if (syncEnabled) {
    emit("synced");
  }
}

export async function ensureCloudSavePushed(
  _data: HabitQuestData,
): Promise<{ ok: true; updatedAt: string } | { ok: false; error: string }> {
  return {
    ok: false,
    error: "Cloud save bootstrap is handled by session boot, not a full document push.",
  };
}
