"use client";

import { pushHabitQuestSaveAction } from "~/app/actions/habitquest-sync";
import type { HabitQuestData } from "~/types/habitquest";

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncEnabled = false;
let latestPayload: HabitQuestData | null = null;
let inFlight: Promise<void> | null = null;
let payloadGeneration = 0;

export type CloudSyncStatus = "guest" | "idle" | "syncing" | "synced" | "error";

type SyncListener = (status: CloudSyncStatus, message?: string) => void;

const listeners = new Set<SyncListener>();

export function setCloudSyncEnabled(enabled: boolean) {
  syncEnabled = enabled;
  if (!enabled && syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
}

function flushOnPageHide() {
  if (!syncEnabled || !latestPayload) {
    return;
  }
  void flushCloudSaveNow();
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushOnPageHide);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushOnPageHide();
    }
  });
}

export function subscribeCloudSync(listener: SyncListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(status: CloudSyncStatus, message?: string) {
  listeners.forEach((listener) => listener(status, message));
}

/**
 * Keep a pending full-save payload current after focused habit writes so a
 * debounced replace cannot wipe newer clears/undos.
 */
export function bumpCloudSavePayload(data: HabitQuestData) {
  if (!syncEnabled) {
    return;
  }
  latestPayload = data;
  payloadGeneration += 1;
}

async function flushCloudSave() {
  if (!syncEnabled || !latestPayload) {
    return;
  }

  const payload = latestPayload;
  const generation = payloadGeneration;
  emit("syncing");

  try {
    const result = await pushHabitQuestSaveAction(payload);
    if (result.status === "ok") {
      emit("synced");
      // More edits landed while this push was in flight — flush again.
      if (payloadGeneration !== generation && latestPayload) {
        scheduleCloudSave(latestPayload);
      }
      return;
    }

    if (result.status === "unauthenticated") {
      syncEnabled = false;
      emit("guest");
      return;
    }

    emit("error", result.error);
  } catch (error) {
    emit(
      "error",
      error instanceof Error ? error.message : "Cloud sync failed.",
    );
  }
}

export function scheduleCloudSave(data: HabitQuestData) {
  if (!syncEnabled) {
    return;
  }

  latestPayload = data;
  payloadGeneration += 1;

  if (syncTimer) {
    clearTimeout(syncTimer);
  }

  syncTimer = setTimeout(() => {
    syncTimer = null;
    inFlight = flushCloudSave().finally(() => {
      inFlight = null;
    });
  }, 700);
}

export async function flushCloudSaveNow(data?: HabitQuestData) {
  if (data) {
    latestPayload = data;
    payloadGeneration += 1;
  }

  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }

  if (inFlight) {
    await inFlight;
  }

  await flushCloudSave();
}
