import {
  BOSS_CLEAR_COINS,
  BOSS_CLEAR_EXP,
  MAX_STREAK_FREEZES,
  STREAK_FREEZE_COST,
} from "~/lib/habitquest/constants";
import { createId, createExpEntry, getTodayDateKey, isFeatureUnlocked, syncProgress } from "~/lib/habitquest/utils";
import type {
  CoinWallet,
  HabitQuestData,
  RewardToast,
  UserProgress,
  UserSettings,
} from "~/types/habitquest";

export type ClaimMutationResult =
  | {
      ok: true;
      data: HabitQuestData;
      wallet: CoinWallet;
      userProgress: UserProgress;
      newExpEntryIds: string[];
      newOwnedItemIds: string[];
      rewardToasts: RewardToast[];
    }
  | { ok: false; error: string };

function createToast(
  type: RewardToast["type"],
  title: string,
  description: string,
): RewardToast {
  return {
    id: createId("toast"),
    type,
    title,
    description,
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
  rewardToasts: RewardToast[],
): ClaimMutationResult {
  return {
    ok: true,
    data,
    wallet: data.wallet,
    userProgress: data.userProgress,
    newExpEntryIds: collectExpDelta(before, data),
    newOwnedItemIds: collectOwnedDelta(before, data),
    rewardToasts,
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

  const rewardToasts: RewardToast[] = [];
  if (challenge.reward.coins > 0) {
    grantCoins(next, challenge.reward.coins);
    rewardToasts.push(
      createToast("coins", "Coins earned", `${challenge.title} +${challenge.reward.coins} coins`),
    );
  }
  if (challenge.reward.exp > 0) {
    grantExp(next, challenge.reward.exp, "challenge", challenge.title);
    rewardToasts.push(
      createToast("exp", "EXP earned", `${challenge.title} +${challenge.reward.exp} EXP`),
    );
  }
  if (challenge.reward.titleItemId) {
    next.shopItems = next.shopItems.map((item) =>
      item.id === challenge.reward.titleItemId ? { ...item, owned: true } : item,
    );
    rewardToasts.push(
      createToast("shop", "Exclusive title unlocked", "A challenge title has been added to your inventory."),
    );
  }

  return finish(before, next, rewardToasts);
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

  const rewardToasts: RewardToast[] = [];
  if (arc.reward.coins > 0) {
    grantCoins(next, arc.reward.coins);
    rewardToasts.push(
      createToast("coins", "Coins earned", `${arc.title} +${arc.reward.coins} coins`),
    );
  }
  if (arc.reward.exp > 0) {
    grantExp(next, arc.reward.exp, "quest", arc.title);
    rewardToasts.push(
      createToast("exp", "EXP earned", `${arc.title} +${arc.reward.exp} EXP`),
    );
  }
  if (arc.reward.unlockThemeId) {
    next.shopItems = next.shopItems.map((item) =>
      item.id === arc.reward.unlockThemeId ? { ...item, owned: true } : item,
    );
    rewardToasts.push(
      createToast("shop", "Theme unlocked", "A quest theme was added to your inventory."),
    );
  }

  return finish(before, next, rewardToasts);
}

export function applyClaimSeasonPassLevel(
  data: HabitQuestData,
  level: number,
): ClaimMutationResult {
  if (!isFeatureUnlocked(data.levelUnlocks, "season-pass")) {
    return { ok: false, error: "Season Pass unlocks at level 4." };
  }

  const reward = data.seasonPass.rewards.find((entry) => entry.level === level);
  if (!reward || data.seasonPass.level < level || data.seasonPass.claimedLevels.includes(level)) {
    return { ok: false, error: "Season reward unavailable." };
  }

  const before = data;
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
  };

  const rewardToasts: RewardToast[] = [];
  if (reward.coins > 0) {
    grantCoins(next, reward.coins);
    rewardToasts.push(
      createToast("coins", "Coins earned", `${reward.label} +${reward.coins} coins`),
    );
  }
  if (reward.exp > 0) {
    grantExp(next, reward.exp, "season", reward.label);
    rewardToasts.push(
      createToast("exp", "EXP earned", `${reward.label} +${reward.exp} EXP`),
    );
  }

  return finish(before, next, rewardToasts);
}

export function applyClaimBossReward(data: HabitQuestData): ClaimMutationResult {
  if (!data.weeklyBoss.defeated || data.weeklyBoss.rewardClaimed) {
    return { ok: false, error: "Boss reward unavailable." };
  }

  const before = data;
  const next: HabitQuestData = {
    ...data,
    weeklyBoss: {
      ...data.weeklyBoss,
      rewardClaimed: true,
    },
    wallet: { ...data.wallet },
    userProgress: {
      ...data.userProgress,
      expHistory: [...data.userProgress.expHistory],
    },
  };

  const label = `${data.weeklyBoss.name} clear`;
  const rewardToasts: RewardToast[] = [];
  grantCoins(next, BOSS_CLEAR_COINS);
  rewardToasts.push(
    createToast("coins", "Coins earned", `${label} +${BOSS_CLEAR_COINS} coins`),
  );
  grantExp(next, BOSS_CLEAR_EXP, "boss", label);
  rewardToasts.push(
    createToast("exp", "EXP earned", `${label} +${BOSS_CLEAR_EXP} EXP`),
  );

  return finish(before, next, rewardToasts);
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

  return finish(before, next, [
    createToast("shop", "Streak freeze bought", `Spent ${STREAK_FREEZE_COST} coins.`),
  ]);
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
