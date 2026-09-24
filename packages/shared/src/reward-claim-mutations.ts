import {
  MAX_STREAK_FREEZES,
  SEASON_PASS_MAX_LEVEL,
  STREAK_FREEZE_COST,
} from "./constants";
import { listClaimableRewards, type ClaimableKind } from "./claimables";
import { createCelebration } from "./rewards";
import { DEFAULT_REMINDER_LOCAL_TIME } from "./reminder-time";
import { createId, createExpEntry, getTodayDateKey, isFeatureUnlocked, syncProgress } from "./utils";
import type {
  CelebrationEvent,
  CoinWallet,
  FloatingReward,
  HabitQuestData,
  UserProgress,
  UserSettings,
} from "./types";

export type { ClaimableKind };

export type ClaimMutationResult =
  | {
      ok: true;
      data: HabitQuestData;
      wallet: CoinWallet;
      userProgress: UserProgress;
      newExpEntryIds: string[];
      newOwnedItemIds: string[];
      floatingRewards: FloatingReward[];
      celebrations: CelebrationEvent[];
    }
  | { ok: false; error: string };

function createFloating(
  kind: FloatingReward["kind"],
  value: number,
  label: string,
): FloatingReward {
  return {
    id: createId("fx"),
    kind,
    value,
    label,
  };
}

function grantCoins(data: HabitQuestData, amount: number) {
  data.wallet = {
    ...data.wallet,
    totalCoins: data.wallet.totalCoins + amount,
    lifetimeCoinsEarned: data.wallet.lifetimeCoinsEarned + amount,
  };
}

function spendCoins(data: HabitQuestData, amount: number) {
  data.wallet = {
    ...data.wallet,
    totalCoins: data.wallet.totalCoins - amount,
    lifetimeCoinsSpent: data.wallet.lifetimeCoinsSpent + amount,
  };
}

function grantExp(
  data: HabitQuestData,
  amount: number,
  source: UserProgress["expHistory"][number]["source"],
  label: string,
) {
  const entry = createExpEntry(amount, getTodayDateKey(), source, label);
  data.userProgress = syncProgress(data.userProgress, data.completions, {
    totalExp: data.userProgress.totalExp + amount,
    expHistory: [entry, ...data.userProgress.expHistory],
  });
  return entry.id;
}

function collectOwnedDelta(before: HabitQuestData, after: HabitQuestData) {
  const beforeOwned = new Set(before.shopItems.filter((item) => item.owned).map((item) => item.id));
  return after.shopItems
    .filter((item) => item.owned && !beforeOwned.has(item.id))
    .map((item) => item.id);
}

function collectExpDelta(before: HabitQuestData, after: HabitQuestData) {
  const beforeIds = new Set(before.userProgress.expHistory.map((entry) => entry.id));
  return after.userProgress.expHistory
    .filter((entry) => !beforeIds.has(entry.id))
    .map((entry) => entry.id);
}

function finish(
  before: HabitQuestData,
  data: HabitQuestData,
  floatingRewards: FloatingReward[],
  celebrations: CelebrationEvent[],
): ClaimMutationResult {
  return {
    ok: true,
    data,
    wallet: data.wallet,
    userProgress: data.userProgress,
    newExpEntryIds: collectExpDelta(before, data),
    newOwnedItemIds: collectOwnedDelta(before, data),
    floatingRewards,
    celebrations,
  };
}

export function applyClaimChallengeReward(
  data: HabitQuestData,
  challengeId: string,
): ClaimMutationResult {
  const challenge = data.challenges.find((entry) => entry.id === challengeId);
  if (!challenge || !challenge.completed || challenge.claimed) {
    return { ok: false, error: "Challenge reward unavailable." };
  }

  const before = data;
  const next: HabitQuestData = {
    ...data,
    challenges: data.challenges.map((entry) =>
      entry.id === challengeId ? { ...entry, claimed: true } : entry,
    ),
    wallet: { ...data.wallet },
    userProgress: {
      ...data.userProgress,
      expHistory: [...data.userProgress.expHistory],
    },
    shopItems: data.shopItems.map((item) => ({ ...item })),
  };

  const floatingRewards: FloatingReward[] = [];
  const celebrations: CelebrationEvent[] = [];
  if (challenge.reward.coins > 0) {
    grantCoins(next, challenge.reward.coins);
    floatingRewards.push(createFloating("coins", challenge.reward.coins, challenge.title));
  }
  if (challenge.reward.exp > 0) {
    grantExp(next, challenge.reward.exp, "challenge", challenge.title);
    floatingRewards.push(createFloating("exp", challenge.reward.exp, challenge.title));
  }
  if (challenge.reward.titleItemId) {
    const titleId = challenge.reward.titleItemId;
    const alreadyOwned = before.shopItems.some((item) => item.id === titleId && item.owned);
    next.shopItems = next.shopItems.map((item) =>
      item.id === titleId ? { ...item, owned: true } : item,
    );
    if (!alreadyOwned) {
      celebrations.push(
        createCelebration(
          "unlock",
          "Exclusive title unlocked",
          next.shopItems.find((item) => item.id === titleId)?.name ?? "",
        ),
      );
    } else {
      const repeatBonus = challenge.period === "monthly" ? 15 : 6;
      grantCoins(next, repeatBonus);
      floatingRewards.push(createFloating("coins", repeatBonus, `${challenge.title} repeat`));
    }
  }

  return finish(before, next, floatingRewards, celebrations);
}

export function applyClaimQuestArcReward(
  data: HabitQuestData,
  arcId: string,
): ClaimMutationResult {
  if (!isFeatureUnlocked(data.levelUnlocks, "quest-arcs")) {
    return { ok: false, error: "Quest arcs unlock at level 3." };
  }

  const arc = data.questArcs.find((entry) => entry.id === arcId);
  if (!arc || !arc.completed || arc.claimed) {
    return { ok: false, error: "Quest reward unavailable." };
  }

  const before = data;
  const next: HabitQuestData = {
    ...data,
    questArcs: data.questArcs.map((entry) =>
      entry.id === arcId ? { ...entry, claimed: true } : entry,
    ),
    wallet: { ...data.wallet },
    userProgress: {
      ...data.userProgress,
      expHistory: [...data.userProgress.expHistory],
    },
    shopItems: data.shopItems.map((item) => ({ ...item })),
  };

  const floatingRewards: FloatingReward[] = [];
  const celebrations: CelebrationEvent[] = [];
  if (arc.reward.coins > 0) {
    grantCoins(next, arc.reward.coins);
    floatingRewards.push(createFloating("coins", arc.reward.coins, arc.title));
  }
  if (arc.reward.exp > 0) {
    grantExp(next, arc.reward.exp, "quest", arc.title);
    floatingRewards.push(createFloating("exp", arc.reward.exp, arc.title));
  }
  if (arc.reward.unlockThemeId) {
    next.shopItems = next.shopItems.map((item) =>
      item.id === arc.reward.unlockThemeId ? { ...item, owned: true } : item,
    );
    celebrations.push(
      createCelebration(
        "unlock",
        "Theme unlocked",
        next.shopItems.find((item) => item.id === arc.reward.unlockThemeId)?.name ?? "",
      ),
    );
  }

  return finish(before, next, floatingRewards, celebrations);
}

export function applyClaimSeasonPassLevel(
  data: HabitQuestData,
  level: number,
): ClaimMutationResult {
  if (!isFeatureUnlocked(data.levelUnlocks, "season-pass")) {
    return { ok: false, error: "Season Pass is not unlocked yet." };
  }

  const reward = data.seasonPass.rewards.find((entry) => entry.level === level);
  if (!reward || data.seasonPass.level < level || data.seasonPass.claimedLevels.includes(level)) {
    return { ok: false, error: "Season reward unavailable." };
  }

  const before = data;
  const isFinale = level === SEASON_PASS_MAX_LEVEL;
  const next: HabitQuestData = {
    ...data,
    seasonPass: {
      ...data.seasonPass,
      claimedLevels: [...data.seasonPass.claimedLevels, level],
    },
    wallet: { ...data.wallet },
    userProgress: {
      ...data.userProgress,
      expHistory: [...data.userProgress.expHistory],
    },
    shopItems: data.shopItems.map((item) => ({ ...item })),
    rewardSystems: isFinale
      ? {
          ...data.rewardSystems,
          seasonPassCompletions: data.rewardSystems.seasonPassCompletions + 1,
        }
      : data.rewardSystems,
  };

  const floatingRewards: FloatingReward[] = [];
  const celebrations: CelebrationEvent[] = [];
  if (reward.coins > 0) {
    grantCoins(next, reward.coins);
    floatingRewards.push(createFloating("coins", reward.coins, reward.label));
  }
  if (reward.exp > 0) {
    grantExp(next, reward.exp, "season", reward.label);
    floatingRewards.push(createFloating("exp", reward.exp, reward.label));
  }
  if (isFinale) {
    const titleId = "title_season_cleared";
    const alreadyOwned = before.shopItems.some((item) => item.id === titleId && item.owned);
    next.shopItems = next.shopItems.map((item) =>
      item.id === titleId ? { ...item, owned: true } : item,
    );
    if (!alreadyOwned) {
      celebrations.push(
        createCelebration(
          "unlock",
          "Exclusive title unlocked",
          next.shopItems.find((item) => item.id === titleId)?.name ?? "Season Cleared",
        ),
      );
    }
  }

  return finish(before, next, floatingRewards, celebrations);
}

/**
 * Claim every currently claimable reward in one pass (ordered by listClaimableRewards).
 * Optional `kinds` filters which reward types to claim.
 */
export function applyClaimAllRewards(
  data: HabitQuestData,
  kinds?: ClaimableKind[],
): ClaimMutationResult {
  const before = data;
  const allowed = kinds?.length ? new Set(kinds) : null;
  const items = listClaimableRewards(data).filter(
    (item) => !allowed || allowed.has(item.kind),
  );

  if (!items.length) {
    return { ok: false, error: "No rewards ready to claim." };
  }

  let next = data;
  const floatingRewards: FloatingReward[] = [];
  const celebrations: CelebrationEvent[] = [];

  for (const item of items) {
    let mutation: ClaimMutationResult;
    if (item.kind === "challenge") {
      mutation = applyClaimChallengeReward(next, item.id.replace("challenge:", ""));
    } else if (item.kind === "quest") {
      mutation = applyClaimQuestArcReward(next, item.id.replace("quest:", ""));
    } else {
      const level = Number(item.id.replace("season:", ""));
      mutation = applyClaimSeasonPassLevel(next, level);
    }

    if (!mutation.ok) {
      continue;
    }
    next = mutation.data;
    floatingRewards.push(...mutation.floatingRewards);
    celebrations.push(...mutation.celebrations);
  }

  if (next === data) {
    return { ok: false, error: "No rewards ready to claim." };
  }

  return finish(before, next, floatingRewards, celebrations);
}

export function applyBuyStreakFreeze(data: HabitQuestData): ClaimMutationResult {
  if (data.rewardSystems.streakFreezes >= MAX_STREAK_FREEZES) {
    return { ok: false, error: `You already hold ${MAX_STREAK_FREEZES} freezes.` };
  }
  if (data.wallet.totalCoins < STREAK_FREEZE_COST) {
    return { ok: false, error: `A streak freeze costs ${STREAK_FREEZE_COST} coins.` };
  }

  const before = data;
  const next: HabitQuestData = {
    ...data,
    rewardSystems: {
      ...data.rewardSystems,
      streakFreezes: data.rewardSystems.streakFreezes + 1,
    },
    wallet: { ...data.wallet },
  };
  spendCoins(next, STREAK_FREEZE_COST);

  return finish(before, next, [], []);
}

export function applyUpdateSettings(
  data: HabitQuestData,
  patch: Partial<UserSettings>,
): { ok: true; data: HabitQuestData; settings: UserSettings } {
  const settings: UserSettings = {
    ...data.settings,
    ...patch,
    displayName:
      patch.displayName !== undefined
        ? patch.displayName.trim().slice(0, 32)
        : data.settings.displayName,
    reminderTime: DEFAULT_REMINDER_LOCAL_TIME,
  };

  return {
    ok: true,
    data: {
      ...data,
      settings,
    },
    settings,
  };
}

export function applyCompleteOnboarding(
  data: HabitQuestData,
  displayName: string,
): { ok: true; data: HabitQuestData; settings: UserSettings } {
  return applyUpdateSettings(data, {
    displayName: displayName.trim().slice(0, 32) || "Adventurer",
    onboardingCompleted: true,
  });
}
