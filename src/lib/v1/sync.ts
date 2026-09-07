import "server-only";

import { eq } from "drizzle-orm";
import type { AuthUser } from "~/lib/auth/session-types";
import { getCurrentUser } from "~/lib/auth/session";
import { SAVE_VERSION } from "~/lib/habitquest/constants";
import { CLOUD_SYNC_TABLES } from "~/lib/habitquest/schema";
import { validateSaveIntegrity, sanitizeSaveForSync } from "~/lib/habitquest/save-integrity";
import { normalizeHabitQuestData } from "~/lib/habitquest/storage";
import { ensureDatabase } from "~/lib/db";
import { loadCatalogFromDb } from "~/lib/db/catalog-repository";
import {
  loadNormalizedSave,
  maybeMigrateLegacyBlob,
  replaceNormalizedSave,
  userHasNormalizedSave,
} from "~/lib/db/habitquest-repository";
import { users } from "~/lib/db/schema";
import type { HabitQuestData } from "~/types/habitquest";

export type SyncValidationResult =
  | { ok: true; data: HabitQuestData; version: number }
  | { ok: false; error: string };

export type PullSaveResult =
  | { status: "ok"; data: HabitQuestData; updatedAt: string; version: number }
  | { status: "empty"; userId: string }
  | { status: "unauthenticated" }
  | { status: "error"; error: string };

export type PushSaveResult =
  | { status: "ok"; updatedAt: string; version: number; migrated?: boolean }
  | { status: "invalid"; error: string }
  | { status: "unauthenticated" }
  | { status: "error"; error: string };

export type BootSessionResult =
  | {
      status: "loaded";
      user: AuthUser;
      data: HabitQuestData;
      source: "cloud" | "local-migrated" | "local-extracted";
      updatedAt: string;
      extracted: boolean;
    }
  | { status: "guest" }
  | { status: "error"; user: AuthUser; error: string };

export async function validateHabitQuestSaveAction(
  payload: unknown,
  previous: HabitQuestData | null = null,
): Promise<SyncValidationResult> {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Save payload must be an object." };
  }

  const candidate = payload as Partial<HabitQuestData>;
  if (!Array.isArray(candidate.habits) || !Array.isArray(candidate.completions)) {
    return { ok: false, error: "Save payload is missing habits or completions." };
  }

  const data = sanitizeSaveForSync(normalizeHabitQuestData(candidate));
  const integrity = validateSaveIntegrity(data, previous);
  if (!integrity.ok) {
    return { ok: false, error: integrity.error };
  }

  return {
    ok: true,
    data,
    version: SAVE_VERSION,
  };
}

async function pullHabitQuestSaveForUser(userId: string): Promise<PullSaveResult> {
  try {
    const database = await ensureDatabase();
    const catalog = await loadCatalogFromDb(database);

    const normalized = await loadNormalizedSave(database, userId, catalog);
    if (normalized) {
      return {
        status: "ok",
        data: normalized.data,
        updatedAt: normalized.updatedAt,
        version: normalized.version,
      };
    }

    const migrated = await maybeMigrateLegacyBlob(database, userId, catalog);
    if (migrated) {
      return {
        status: "ok",
        data: migrated.data,
        updatedAt: migrated.updatedAt,
        version: migrated.version,
      };
    }

    return { status: "empty", userId };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to pull cloud save.",
    };
  }
}

export async function pullHabitQuestSaveAction(): Promise<PullSaveResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { status: "unauthenticated" };
  }

  return pullHabitQuestSaveForUser(user.id);
}

/**
 * Replaces the authenticated user's normalized HabitQuest rows.
 */
export async function pushHabitQuestSaveAction(
  payload: unknown,
): Promise<PushSaveResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { status: "unauthenticated" };
    }

    const database = await ensureDatabase();
    const catalog = await loadCatalogFromDb(database);
    const existing = await loadNormalizedSave(database, user.id, catalog);
    const previous = existing?.data ?? null;

    const validation = await validateHabitQuestSaveAction(payload, previous);
    if (!validation.ok) {
      return {
        status: "invalid",
        error: validation.error,
      };
    }

    const existed = Boolean(existing) || (await userHasNormalizedSave(database, user.id));
    const saved = await replaceNormalizedSave(database, user.id, validation.data);

    if (validation.data.settings.displayName.trim()) {
      await database
        .update(users)
        .set({
          displayName: validation.data.settings.displayName.trim().slice(0, 32),
          updatedAt: saved.updatedAt,
        })
        .where(eq(users.id, user.id));
    }

    return {
      status: "ok",
      updatedAt: saved.updatedAt,
      version: saved.version,
      migrated: !existed,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to push cloud save.",
    };
  }
}

async function syncAfterPull(
  pull: PullSaveResult,
  localPayload: unknown,
  options: { extractLocal?: boolean },
): Promise<
  | {
      status: "loaded";
      data: HabitQuestData;
      source: "cloud" | "local-migrated" | "local-extracted";
      updatedAt: string;
      extracted: boolean;
    }
  | { status: "unauthenticated" }
  | { status: "error"; error: string }
> {
  if (pull.status === "unauthenticated") {
    return { status: "unauthenticated" };
  }

  if (pull.status === "error") {
    return { status: "error", error: pull.error };
  }

  const shouldExtract = Boolean(options.extractLocal);

  if (shouldExtract) {
    const push = await pushHabitQuestSaveAction(localPayload);
    if (push.status === "ok") {
      const validation = await validateHabitQuestSaveAction(localPayload);
      if (!validation.ok) {
        return { status: "error", error: validation.error };
      }

      return {
        status: "loaded",
        data: validation.data,
        source: pull.status === "ok" ? "local-extracted" : "local-migrated",
        updatedAt: push.updatedAt,
        extracted: true,
      };
    }

    if (push.status === "unauthenticated") {
      return { status: "unauthenticated" };
    }

    return {
      status: "error",
      error: push.status === "invalid" || push.status === "error" ? push.error : "Extract failed.",
    };
  }

  if (pull.status === "ok") {
    return {
      status: "loaded",
      data: pull.data,
      source: "cloud",
      updatedAt: pull.updatedAt,
      extracted: false,
    };
  }

  const push = await pushHabitQuestSaveAction(localPayload);
  if (push.status === "ok") {
    const validation = await validateHabitQuestSaveAction(localPayload);
    if (!validation.ok) {
      return { status: "error", error: validation.error };
    }

    return {
      status: "loaded",
      data: validation.data,
      source: "local-migrated",
      updatedAt: push.updatedAt,
      extracted: true,
    };
  }

  if (push.status === "unauthenticated") {
    return { status: "unauthenticated" };
  }

  return {
    status: "error",
    error: push.status === "invalid" || push.status === "error" ? push.error : "Sync failed.",
  };
}

export async function syncHabitQuestOnAuthAction(
  localPayload: unknown,
  options: { extractLocal?: boolean } = {},
): Promise<
  | {
      status: "loaded";
      data: HabitQuestData;
      source: "cloud" | "local-migrated" | "local-extracted";
      updatedAt: string;
      extracted: boolean;
    }
  | { status: "unauthenticated" }
  | { status: "error"; error: string }
> {
  const pull = await pullHabitQuestSaveAction();
  return syncAfterPull(pull, localPayload, options);
}

/**
 * Single round-trip for refresh: session + cloud save (or local migrate).
 * Prefer this over getSessionAction + syncHabitQuestOnAuthAction.
 */
export async function bootHabitQuestSessionAction(
  localPayload: unknown,
  options: { extractLocal?: boolean } = {},
): Promise<BootSessionResult> {
  let user: AuthUser | null = null;
  try {
    user = await getCurrentUser();
    if (!user) {
      return { status: "guest" };
    }

    const pull = await pullHabitQuestSaveForUser(user.id);
    const sync = await syncAfterPull(pull, localPayload, options);

    if (sync.status === "loaded") {
      return {
        status: "loaded",
        user,
        data: sync.data,
        source: sync.source,
        updatedAt: sync.updatedAt,
        extracted: sync.extracted,
      };
    }

    if (sync.status === "unauthenticated") {
      return { status: "guest" };
    }

    return { status: "error", user, error: sync.error };
  } catch (error) {
    if (!user) {
      return { status: "guest" };
    }
    return {
      status: "error",
      user,
      error: error instanceof Error ? error.message : "Failed to boot session.",
    };
  }
}

export async function getHabitQuestMigrationPlanAction() {
  return {
    version: SAVE_VERSION,
    tables: CLOUD_SYNC_TABLES,
    activeAdapter: "postgres normalized rows",
    steps: [
      "Authenticate via email/password",
      "Load HabitQuestData from normalized PostgreSQL tables",
      "Hydrate Zustand as the optimistic client cache",
      "Debounced pushHabitQuestSaveAction replaces user rows",
      "Legacy habitquest_saves blobs migrate once into rows",
    ],
  };
}
