"use server";

import { getCurrentUser } from "~/lib/auth/session";
import { ensureDatabase } from "~/lib/db";
import { loadCatalogFromDb } from "~/lib/db/catalog-repository";
import {
  loadNormalizedSave,
  persistEconomyClaim,
  persistUserSettings,
} from "~/lib/db/habitquest-repository";
import {
  applyBuyStreakFreeze,
  applyClaimBossReward,
  applyClaimChallengeReward,
  applyClaimQuestArcReward,
  applyClaimSeasonPassLevel,
  applyCompleteOnboarding,
  applyUpdateSettings,
} from "~/lib/habitquest/reward-claim-mutations";
import type {
  CoinWallet,
  HabitQuestData,
  QuestArc,
  SeasonPassState,
  UserProgress,
  UserSettings,
  WeeklyBossState,
} from "~/types/habitquest";

export type SettingsActionResult =
  | { status: "ok"; settings: UserSettings; updatedAt: string }
  | { status: "unauthenticated" }
  | { status: "error"; error: string };

export type ClaimActionResult =
  | {
      status: "ok";
      wallet: CoinWallet;
      userProgress: UserProgress;
      challenges?: HabitQuestData["challenges"];
      questArcs?: QuestArc[];
      seasonPass?: SeasonPassState;
      weeklyBoss?: WeeklyBossState;
      rewardSystems?: HabitQuestData["rewardSystems"];
      shopItems?: HabitQuestData["shopItems"];
      updatedAt: string;
    }
  | { status: "unauthenticated" }
  | { status: "error"; error: string };

function economyFromMutation(data: HabitQuestData, mutation: {
  wallet: CoinWallet;
  userProgress: UserProgress;
  newExpEntryIds: string[];
  newOwnedItemIds: string[];
}) {
  return {
    wallet: mutation.wallet,
    userProgress: mutation.userProgress,
    newExpEntryIds: mutation.newExpEntryIds,
    newOwnedItemIds: mutation.newOwnedItemIds,
  };
}

export async function updateSettingsAction(
  patch: Partial<UserSettings>,
): Promise<SettingsActionResult> {
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

    const mutation = applyUpdateSettings(existing.data, patch);
    const saved = await persistUserSettings(database, user.id, mutation.settings);
    return {
      status: "ok",
      settings: saved.settings,
      updatedAt: saved.updatedAt,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to update settings.",
    };
  }
}

export async function completeOnboardingAction(
  displayName: string,
): Promise<SettingsActionResult> {
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

    const mutation = applyCompleteOnboarding(existing.data, displayName);
    const saved = await persistUserSettings(database, user.id, mutation.settings);
    return {
      status: "ok",
      settings: saved.settings,
      updatedAt: saved.updatedAt,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to complete onboarding.",
    };
  }
}

export async function claimChallengeRewardAction(
  challengeId: string,
): Promise<ClaimActionResult> {
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

    const mutation = applyClaimChallengeReward(existing.data, challengeId);
    if (!mutation.ok) {
      return { status: "error", error: mutation.error };
    }

    const challenge = mutation.data.challenges.find((entry) => entry.id === challengeId);
    if (!challenge) {
      return { status: "error", error: "Challenge missing after claim." };
    }

    const saved = await persistEconomyClaim(database, user.id, {
      ...economyFromMutation(mutation.data, mutation),
      challenge: {
        challengeKey: challenge.key,
        startsAt: challenge.startsAt,
        claimed: true,
      },
    });

    return {
      status: "ok",
      wallet: mutation.wallet,
      userProgress: mutation.userProgress,
      challenges: mutation.data.challenges,
      shopItems: mutation.data.shopItems,
      updatedAt: saved.updatedAt,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to claim challenge reward.",
    };
  }
}

export async function claimQuestArcRewardAction(arcId: string): Promise<ClaimActionResult> {
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

    const mutation = applyClaimQuestArcReward(existing.data, arcId);
    if (!mutation.ok) {
      return { status: "error", error: mutation.error };
    }

    const arc = mutation.data.questArcs.find((entry) => entry.id === arcId);
    if (!arc) {
      return { status: "error", error: "Quest missing after claim." };
    }

    const saved = await persistEconomyClaim(database, user.id, {
      ...economyFromMutation(mutation.data, mutation),
      quest: { questKey: arc.key, claimed: true },
    });

    return {
      status: "ok",
      wallet: mutation.wallet,
      userProgress: mutation.userProgress,
      questArcs: mutation.data.questArcs,
      shopItems: mutation.data.shopItems,
      updatedAt: saved.updatedAt,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to claim quest reward.",
    };
  }
}

export async function claimSeasonPassLevelAction(level: number): Promise<ClaimActionResult> {
  try {
    if (!Number.isInteger(level) || level < 1) {
      return { status: "error", error: "Invalid season level." };
    }

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

    const mutation = applyClaimSeasonPassLevel(existing.data, level);
    if (!mutation.ok) {
      return { status: "error", error: mutation.error };
    }

    const saved = await persistEconomyClaim(database, user.id, {
      ...economyFromMutation(mutation.data, mutation),
      seasonClaimedLevels: mutation.data.seasonPass.claimedLevels,
    });

    return {
      status: "ok",
      wallet: mutation.wallet,
      userProgress: mutation.userProgress,
      seasonPass: mutation.data.seasonPass,
      updatedAt: saved.updatedAt,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to claim season reward.",
    };
  }
}

export async function claimBossRewardAction(): Promise<ClaimActionResult> {
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

    const mutation = applyClaimBossReward(existing.data);
    if (!mutation.ok) {
      return { status: "error", error: mutation.error };
    }

    const saved = await persistEconomyClaim(database, user.id, {
      ...economyFromMutation(mutation.data, mutation),
      bossRewardClaimed: true,
    });

    return {
      status: "ok",
      wallet: mutation.wallet,
      userProgress: mutation.userProgress,
      weeklyBoss: mutation.data.weeklyBoss,
      updatedAt: saved.updatedAt,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to claim boss reward.",
    };
  }
}

export async function buyStreakFreezeAction(): Promise<ClaimActionResult> {
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

    const mutation = applyBuyStreakFreeze(existing.data);
    if (!mutation.ok) {
      return { status: "error", error: mutation.error };
    }

    const saved = await persistEconomyClaim(database, user.id, {
      ...economyFromMutation(mutation.data, mutation),
      streakFreezes: mutation.data.rewardSystems.streakFreezes,
    });

    return {
      status: "ok",
      wallet: mutation.wallet,
      userProgress: mutation.userProgress,
      rewardSystems: mutation.data.rewardSystems,
      updatedAt: saved.updatedAt,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to buy streak freeze.",
    };
  }
}
