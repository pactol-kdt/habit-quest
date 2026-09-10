import "server-only";

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
  applyClaimAllRewards,
  applyClaimBossReward,
  applyClaimChallengeReward,
  applyClaimQuestArcReward,
  applyClaimSeasonPassLevel,
  applyCompleteOnboarding,
  applyUpdateSettings,
  type ClaimableKind,
} from "~/lib/habitquest/reward-claim-mutations";
import { listClaimableRewards } from "~/lib/habitquest/claimables";
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
      return { status: "error", error: "No cloud save found. Syncing your progress and try claiming again." };
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
      return { status: "error", error: "No cloud save found. Syncing your progress and try claiming again." };
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
      return { status: "error", error: "No cloud save found. Syncing your progress and try claiming again." };
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
      return { status: "error", error: "No cloud save found. Syncing your progress and try claiming again." };
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
      return { status: "error", error: "No cloud save found. Syncing your progress and try claiming again." };
    }

    const mutation = applyClaimSeasonPassLevel(existing.data, level);
    if (!mutation.ok) {
      return { status: "error", error: mutation.error };
    }

    const saved = await persistEconomyClaim(database, user.id, {
      ...economyFromMutation(mutation.data, mutation),
      seasonClaimedLevels: mutation.data.seasonPass.claimedLevels,
      seasonPassCompletions: mutation.data.rewardSystems.seasonPassCompletions,
    });

    return {
      status: "ok",
      wallet: mutation.wallet,
      userProgress: mutation.userProgress,
      seasonPass: mutation.data.seasonPass,
      rewardSystems: mutation.data.rewardSystems,
      shopItems: mutation.data.shopItems,
      updatedAt: saved.updatedAt,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to claim season reward.",
    };
  }
}

const CLAIMABLE_KINDS = new Set<ClaimableKind>(["challenge", "quest", "season", "boss"]);

function normalizeClaimKinds(kinds?: string[]): ClaimableKind[] | undefined {
  if (!kinds?.length) {
    return undefined;
  }
  const filtered = [...new Set(kinds)].filter(
    (kind): kind is ClaimableKind => CLAIMABLE_KINDS.has(kind as ClaimableKind),
  );
  return filtered.length ? filtered : undefined;
}

/**
 * Claim every ready reward in one load + one economy write (fixes wallet races).
 */
export async function claimAllRewardsAction(
  kindsInput?: string[],
): Promise<ClaimActionResult> {
  try {
    const kinds = normalizeClaimKinds(kindsInput);
    const user = await getCurrentUser();
    if (!user) {
      return { status: "unauthenticated" };
    }

    const database = await ensureDatabase();
    const catalog = await loadCatalogFromDb(database);
    const existing = await loadNormalizedSave(database, user.id, catalog);
    if (!existing) {
      return {
        status: "error",
        error: "No cloud save found. Syncing your progress and try claiming again.",
      };
    }

    const claimables = listClaimableRewards(existing.data).filter(
      (item) => !kinds || kinds.includes(item.kind),
    );
    if (!claimables.length) {
      return { status: "error", error: "No rewards ready to claim." };
    }

    const mutation = applyClaimAllRewards(existing.data, kinds);
    if (!mutation.ok) {
      return { status: "error", error: mutation.error };
    }

    const beforeChallenges = new Map(
      existing.data.challenges.map((entry) => [entry.id, entry] as const),
    );
    const beforeQuests = new Map(
      existing.data.questArcs.map((entry) => [entry.id, entry] as const),
    );

    const challenges = mutation.data.challenges
      .filter((entry) => entry.claimed && !beforeChallenges.get(entry.id)?.claimed)
      .map((entry) => ({
        challengeKey: entry.key,
        startsAt: entry.startsAt,
        claimed: true as const,
      }));
    const quests = mutation.data.questArcs
      .filter((entry) => entry.claimed && !beforeQuests.get(entry.id)?.claimed)
      .map((entry) => ({
        questKey: entry.key,
        claimed: true as const,
      }));

    const seasonChanged =
      mutation.data.seasonPass.claimedLevels.length !==
      existing.data.seasonPass.claimedLevels.length;
    const bossChanged =
      mutation.data.weeklyBoss.rewardClaimed && !existing.data.weeklyBoss.rewardClaimed;

    const saved = await persistEconomyClaim(database, user.id, {
      ...economyFromMutation(mutation.data, mutation),
      challenges: challenges.length ? challenges : undefined,
      quests: quests.length ? quests : undefined,
      seasonClaimedLevels: seasonChanged
        ? mutation.data.seasonPass.claimedLevels
        : undefined,
      seasonPassCompletions: seasonChanged
        ? mutation.data.rewardSystems.seasonPassCompletions
        : undefined,
      bossRewardClaimed: bossChanged ? true : undefined,
    });

    return {
      status: "ok",
      wallet: mutation.wallet,
      userProgress: mutation.userProgress,
      challenges: mutation.data.challenges,
      questArcs: mutation.data.questArcs,
      seasonPass: mutation.data.seasonPass,
      weeklyBoss: mutation.data.weeklyBoss,
      rewardSystems: mutation.data.rewardSystems,
      shopItems: mutation.data.shopItems,
      updatedAt: saved.updatedAt,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to claim rewards.",
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
      return { status: "error", error: "No cloud save found. Syncing your progress and try claiming again." };
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
      return { status: "error", error: "No cloud save found. Syncing your progress and try claiming again." };
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
