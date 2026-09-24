import "server-only";

import { getCurrentUser } from "~/lib/auth/session";
import { ensureDatabase } from "~/lib/db";
import { loadCatalogFromDb } from "~/lib/db/catalog-repository";
import { loadNormalizedSave, persistGamePatch } from "~/lib/db/habitquest-repository";
import {
  buildGamePatch,
  isEmptyGamePatch,
  type GamePatch,
} from "~/lib/habitquest/game-patch";
import { resolvePersistentGameState } from "~/lib/habitquest/game-resolution";
import type { SettlementRecap } from "~/types/habitquest";

export type SettleSessionResult =
  | ({
      status: "ok";
      settlementRecap: SettlementRecap | null;
      granted: {
        dailyLogin: boolean;
        settlement: boolean;
      };
    } & GamePatch)
  | { status: "unauthenticated" }
  | { status: "error"; error: string };

/**
 * Daily login, comeback, and end-of-day settlement for signed-in players.
 * Idempotent: re-running after a grant returns an empty patch (or lastLogin touch only).
 */
export async function settleSessionAction(): Promise<SettleSessionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { status: "unauthenticated" };
    }

    const database = await ensureDatabase();
    const catalog = await loadCatalogFromDb(database);
    const existing = await loadNormalizedSave(database, user.id, catalog);
    if (!existing) {
      return { status: "error", error: "No cloud save found." };
    }

    const before = existing.data;
    const claimedBefore = before.dailyRewards.claimedDailyLoginDate;
    const settledBefore = before.rewardSystems.progressSettledThroughDate;
    const comebackBefore = before.rewardSystems.lastComebackDate;

    const resolution = resolvePersistentGameState(before, {
      processDailyLogin: true,
    });
    const patch = buildGamePatch(before, resolution.data);

    const dailyLogin =
      Boolean(resolution.data.dailyRewards.claimedDailyLoginDate) &&
      resolution.data.dailyRewards.claimedDailyLoginDate !== claimedBefore;
    const settlement =
      Boolean(resolution.settlementRecap) ||
      resolution.data.rewardSystems.progressSettledThroughDate !== settledBefore ||
      resolution.data.rewardSystems.lastComebackDate !== comebackBefore;

    if (isEmptyGamePatch(patch)) {
      return {
        status: "ok",
        updatedAt: existing.updatedAt,
        settlementRecap: resolution.settlementRecap,
        granted: { dailyLogin: false, settlement: false },
      };
    }

    const saved = await persistGamePatch(database, user.id, patch);
    return {
      status: "ok",
      ...patch,
      updatedAt: saved.updatedAt,
      settlementRecap: resolution.settlementRecap,
      granted: { dailyLogin, settlement },
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to settle session.",
    };
  }
}
