"use client";

import { create } from "zustand";
import type { AuthUser } from "~/lib/auth/session-types";
import {
  buyStreakFreezeRequest,
  claimAllRewardsRequest,
  claimBossRewardRequest,
  claimChallengeRewardRequest,
  claimQuestArcRewardRequest,
  claimSeasonPassLevelRequest,
  completeHabitRequest,
  completeHabitsRequest,
  completeOnboardingRequest,
  createHabitRequest,
  deleteHabitRequest,
  equipShopItemRequest,
  purchaseShopItemRequest,
  unequipShopItemRequest,
  uncompleteHabitRequest,
  updateHabitRequest,
  updateSettingsRequest,
} from "~/lib/v1/requests";
import {
  bumpCloudSavePayload,
  ensureCloudSavePushed,
  flushCloudSaveNow,
  scheduleCloudSave,
  setCloudSyncEnabled,
} from "~/lib/habitquest/cloud-sync";
import {
  DAILY_LOGIN_COINS,
  MAX_STREAK_FREEZES,
  setLocalPersistenceEnabled,
} from "~/lib/habitquest/constants";
import {
  applyCreateHabit,
  applyDeleteHabit,
  applyUpdateHabit,
} from "~/lib/habitquest/habit-crud-mutations";
import {
  applyCompleteHabitForToday,
  applyUncompleteHabitForToday,
  mergeHabitCompletionIntoState,
  mergeHabitCompletionsIntoState,
} from "~/lib/habitquest/habit-mutations";
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
import {
  applyEquipShopItem,
  applyPurchaseShopItem,
  applyUnequipShopItem,
} from "~/lib/habitquest/shop-mutations";
import {
  createCelebration,
  createDefaultRewardSystems,
  createQuestArcs,
  createSeasonPass,
  createWeeklyBoss,
  maybeGrantStreakFreeze,
  reconcileSeasonPass,
  reconcileStreakShields,
  reconcileWeeklyBoss,
  reconcileTodayCombo,
  recordWeeklyBossCompletion,
  syncQuestArcs,
} from "~/lib/habitquest/rewards";
import { getEffectiveUserProgress, settleHabitDayProgress } from "~/lib/habitquest/day-settlement";
import { createSeedData } from "~/lib/habitquest/seed";
import {
  loadHabitQuestData,
  saveHabitQuestData,
  cacheAuthUser,
  clearCachedAuthUser,
  setGuestPlayEnabled,
} from "~/lib/habitquest/storage";
import {
  checkLevelUnlocks,
  createExpEntry,
  createId,
  getPendingAchievementRewards,
  getTodayDateKey,
  hasClaimedDailyReward,
  reconcileChallenges,
  unlockAchievements,
} from "~/lib/habitquest/utils";
import type {
  CelebrationEvent,
  Challenge,
  ExpHistoryEntry,
  FloatingReward,
  HabitFormValues,
  HabitQuestData,
  RewardToast,
  SettlementRecap,
  ShopCategory,
  UserSettings,
} from "~/types/habitquest";

export type HabitPendingAction =
  | "complete"
  | "uncomplete"
  | "delete"
  | "create"
  | "update";

type HabitQuestStore = HabitQuestData & {
  hydrated: boolean;
  authChecked: boolean;
  authUser: AuthUser | null;
  guestPlay: boolean;
  pendingHabitIds: string[];
  pendingHabitActions: Record<string, HabitPendingAction>;
  pendingShopItemIds: string[];
  pendingClaimIds: string[];
  rewardToasts: RewardToast[];
  floatingRewards: FloatingReward[];
  celebration: CelebrationEvent | null;
  settlementRecap: SettlementRecap | null;
  dismissedSettlementThroughDate: string | null;
  hydrate: () => void;
  setAuthChecked: (checked: boolean) => void;
  setAuthUser: (user: AuthUser | null) => void;
  startGuestPlay: () => void;
  exitGuestPlay: () => void;
  projectSave: () => HabitQuestData;
  applyRemoteSave: (data: HabitQuestData, options?: ResolutionOptions) => void;
  applyAuthenticatedSave: (
    data: HabitQuestData,
    options?: ResolutionOptions,
  ) => void;
  createHabit: (values: HabitFormValues) => void;
  updateHabit: (habitId: string, values: HabitFormValues) => void;
  deleteHabit: (habitId: string) => void;
  completeHabitForToday: (habitId: string) => void;
  uncompleteHabitForToday: (habitId: string) => void;
  claimChallengeReward: (challengeId: string) => void;
  claimQuestArcReward: (arcId: string) => void;
  claimSeasonPassLevel: (level: number) => void;
  claimAllRewards: (kinds?: ClaimableKind[]) => void;
  claimBossReward: () => void;
  buyStreakFreeze: () => void;
  purchaseShopItem: (itemId: string) => void;
  equipShopItem: (itemId: string) => void;
  unequipShopItem: (category: ShopCategory) => void;
  updateSettings: (patch: Partial<UserSettings>) => void;
  completeOnboarding: (displayName: string) => void;
  dismissToast: (toastId: string) => void;
  dismissFloatingReward: (rewardId: string) => void;
  dismissCelebration: () => void;
  dismissSettlementRecap: () => void;
};

const initialData = createSeedData();

const SETTLEMENT_RECAP_SEEN_KEY = "habitquest:settlement-recap-seen";

function hasSeenSettlementRecap(throughDate: string) {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return sessionStorage.getItem(SETTLEMENT_RECAP_SEEN_KEY) === throughDate;
  } catch {
    return false;
  }
}

function markSettlementRecapSeen(throughDate: string) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(SETTLEMENT_RECAP_SEEN_KEY, throughDate);
  } catch {
    // Ignore quota / private mode failures.
  }
}

function acceptSettlementRecap(
  recap: SettlementRecap | null,
  dismissedThroughDate: string | null,
): SettlementRecap | null {
  if (!recap) {
    return null;
  }
  if (dismissedThroughDate === recap.throughDate) {
    return null;
  }
  if (hasSeenSettlementRecap(recap.throughDate)) {
    return null;
  }
  return recap;
}

type ResolutionOptions = {
  processDailyLogin?: boolean;
};

type ResolutionResult = {
  data: HabitQuestData;
  rewardToasts: RewardToast[];
  floatingRewards: FloatingReward[];
  celebration: CelebrationEvent | null;
  settlementRecap: SettlementRecap | null;
};

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

function createFloatingReward(
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

function persistData(nextData: HabitQuestData) {
  saveHabitQuestData(nextData);
  scheduleCloudSave(nextData);
  return nextData;
}

/** Local cache only — used with focused habit APIs so we don't dump the full save. */
function persistLocalOnly(nextData: HabitQuestData) {
  saveHabitQuestData(nextData);
  return nextData;
}

/**
 * Habit membership lives in the store + surgical APIs. Stale mutation snapshots
 * must not resurrect deleted habits (or drop concurrent creates) when a later
 * complete / undo / purchase reapplies `mutation.data`.
 */
function withLiveHabitMembership(
  data: HabitQuestData,
  options?: { excludeHabitId?: string },
): HabitQuestData {
  let habits = useHabitQuestStore.getState().habits;
  if (options?.excludeHabitId) {
    habits = habits.filter((habit) => habit.id !== options.excludeHabitId);
  }
  return { ...data, habits };
}

function projectData(state: HabitQuestStore): HabitQuestData {
  return {
    version: state.version,
    habits: state.habits,
    completions: state.completions,
    achievements: state.achievements,
    challenges: state.challenges,
    shopItems: state.shopItems,
    equippedItems: state.equippedItems,
    wallet: state.wallet,
    dailyRewards: state.dailyRewards,
    levelUnlocks: state.levelUnlocks,
    userProgress: state.userProgress,
    settings: state.settings,
    rewardSystems: state.rewardSystems,
    questArcs: state.questArcs,
    seasonPass: state.seasonPass,
    weeklyBoss: state.weeklyBoss,
  };
}

function syncWithShields(
  data: HabitQuestData,
  extra: Partial<HabitQuestData["userProgress"]> = {},
) {
  return getEffectiveUserProgress({
    ...data,
    userProgress: {
      ...data.userProgress,
      ...extra,
    },
  });
}

function appendCoins(
  data: HabitQuestData,
  amount: number,
  label: string,
  rewardToasts: RewardToast[],
  floatingRewards: FloatingReward[],
) {
  data.wallet = {
    ...data.wallet,
    totalCoins: data.wallet.totalCoins + amount,
    lifetimeCoinsEarned: data.wallet.lifetimeCoinsEarned + amount,
  };
  rewardToasts.push(createToast("coins", "Coins earned", `${label} +${amount} coins`));
  floatingRewards.push(createFloatingReward("coins", amount, label));
}

function appendExp(
  data: HabitQuestData,
  amount: number,
  source: ExpHistoryEntry["source"],
  label: string,
  rewardToasts: RewardToast[],
  floatingRewards: FloatingReward[],
) {
  const today = getTodayDateKey();
  data.userProgress = syncWithShields(data, {
    totalExp: data.userProgress.totalExp + amount,
    expHistory: [createExpEntry(amount, today, source, label), ...data.userProgress.expHistory],
  });
  rewardToasts.push(createToast("exp", "EXP earned", `${label} +${amount} EXP`));
  floatingRewards.push(createFloatingReward("exp", amount, label));
}

function applyChallengeReward(
  data: HabitQuestData,
  challenge: Challenge,
  rewardToasts: RewardToast[],
  floatingRewards: FloatingReward[],
  options: { autoClaimed?: boolean } = {},
) {
  if (challenge.reward.coins > 0) {
    appendCoins(
      data,
      challenge.reward.coins,
      options.autoClaimed ? `${challenge.title} (auto-claimed)` : challenge.title,
      rewardToasts,
      floatingRewards,
    );
  }

  if (challenge.reward.exp > 0) {
    appendExp(
      data,
      challenge.reward.exp,
      "challenge",
      options.autoClaimed ? `${challenge.title} (auto-claimed)` : challenge.title,
      rewardToasts,
      floatingRewards,
    );
  }

  if (challenge.reward.titleItemId) {
    const titleId = challenge.reward.titleItemId;
    const alreadyOwned = data.shopItems.some((item) => item.id === titleId && item.owned);
    data.shopItems = data.shopItems.map((item) =>
      item.id === titleId
        ? {
            ...item,
            owned: true,
          }
        : item,
    );
    if (!alreadyOwned) {
      rewardToasts.push(
        createToast(
          "shop",
          options.autoClaimed ? "Challenge title auto-claimed" : "Exclusive title unlocked",
          "A challenge title has been added to your inventory.",
        ),
      );
    } else {
      // Repeat clear: title already earned — bonus coins instead of a fake title grant.
      const repeatBonus = challenge.period === "monthly" ? 25 : 10;
      appendCoins(
        data,
        repeatBonus,
        options.autoClaimed
          ? `${challenge.title} repeat bonus (auto-claimed)`
          : `${challenge.title} repeat bonus`,
        rewardToasts,
        floatingRewards,
      );
    }
  }
}

function ensureRewardFields(data: HabitQuestData): HabitQuestData {
  const defaults = createDefaultRewardSystems();
  const rewardSystems = {
    ...defaults,
    ...(data.rewardSystems ?? {}),
    seasonPassCompletions: data.rewardSystems?.seasonPassCompletions ?? 0,
    weeklyBossCompletions: data.rewardSystems?.weeklyBossCompletions ?? 0,
    lastCountedBossWeekKey: data.rewardSystems?.lastCountedBossWeekKey ?? null,
  };
  return {
    ...data,
    rewardSystems,
    questArcs: data.questArcs?.length ? data.questArcs : createQuestArcs(),
    seasonPass: data.seasonPass ?? createSeasonPass(),
    weeklyBoss: data.weeklyBoss ?? createWeeklyBoss(),
    equippedItems: {
      titleItemId: data.equippedItems?.titleItemId ?? null,
      frameItemId: data.equippedItems?.frameItemId ?? null,
      avatarItemId: data.equippedItems?.avatarItemId ?? null,
      themeItemId: data.equippedItems?.themeItemId ?? null,
    },
  };
}

function normalizePersistentData(data: HabitQuestData) {
  const withRewards = ensureRewardFields(data);
  const rewardSystems = recordWeeklyBossCompletion(
    reconcileTodayCombo(withRewards.rewardSystems, withRewards.completions),
    withRewards.weeklyBoss.weekKey,
    withRewards.weeklyBoss.defeated,
  );
  return {
    ...withRewards,
    rewardSystems,
    seasonPass: reconcileSeasonPass(withRewards.seasonPass),
    weeklyBoss: reconcileWeeklyBoss(withRewards.weeklyBoss),
    userProgress: syncWithShields({ ...withRewards, rewardSystems }),
  };
}

function resolveGameState(
  baseData: HabitQuestData,
  options: ResolutionOptions = {},
): ResolutionResult {
  let data = normalizePersistentData(baseData);
  const rewardToasts: RewardToast[] = [];
  const floatingRewards: FloatingReward[] = [];
  let celebration: CelebrationEvent | null = null;
  let settlementRecap: SettlementRecap | null = null;
  const today = getTodayDateKey();

  if (options.processDailyLogin) {
    const sessionKey = `habitquest:daily-login-claimed:${today}`;
    let claimedInSession = false;
    try {
      claimedInSession =
        typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem(sessionKey) === "1";
    } catch {
      claimedInSession = false;
    }

    const alreadyClaimed = hasClaimedDailyReward(data.dailyRewards, "login", today);

    if (!alreadyClaimed && !claimedInSession) {
      appendCoins(data, DAILY_LOGIN_COINS, "Daily login reward", rewardToasts, floatingRewards);
      data.dailyRewards = {
        ...data.dailyRewards,
        lastLoginDate: today,
        claimedDailyLoginDate: today,
      };
      try {
        sessionStorage.setItem(sessionKey, "1");
      } catch {
        // Ignore sessionStorage failures.
      }
    } else if (!alreadyClaimed && claimedInSession) {
      // Already paid this browser session — mark claimed without paying again.
      data.dailyRewards = {
        ...data.dailyRewards,
        lastLoginDate: today,
        claimedDailyLoginDate: today,
      };
    } else {
      if (data.dailyRewards.lastLoginDate !== today) {
        data.dailyRewards = {
          ...data.dailyRewards,
          lastLoginDate: today,
        };
      }
      try {
        sessionStorage.setItem(sessionKey, "1");
      } catch {
        // Ignore sessionStorage failures.
      }
    }
  }

  const settlement = settleHabitDayProgress(data, today);
  data = settlement.data;
  rewardToasts.push(...settlement.rewardToasts);
  floatingRewards.push(...settlement.floatingRewards);
  settlementRecap = settlement.recap;
  if (settlement.celebrations.length) {
    celebration = settlement.celebrations[settlement.celebrations.length - 1] ?? null;
  }

  const shieldResult = reconcileStreakShields(data.rewardSystems, data.completions, today);
  data.rewardSystems = shieldResult.systems;
  if (shieldResult.freezeUsed && shieldResult.protectedDate) {
    rewardToasts.push(
      createToast(
        "unlock",
        "Streak freeze used",
        `Your streak was protected on ${shieldResult.protectedDate}.`,
      ),
    );
  }

  data.userProgress = syncWithShields(data);

  const freezeGrant = maybeGrantStreakFreeze(
    data.rewardSystems,
    data.userProgress.currentStreak,
  );
  data.rewardSystems = freezeGrant.systems;
  if (freezeGrant.granted) {
    rewardToasts.push(
      createToast(
        "unlock",
        "Streak freeze earned",
        `Milestone streak ${data.userProgress.currentStreak} granted a freeze (${data.rewardSystems.streakFreezes}/${MAX_STREAK_FREEZES}).`,
      ),
    );
  }

  data.questArcs = syncQuestArcs(
    data.questArcs,
    data,
    data.rewardSystems.progressSettledThroughDate,
  );

  const challengeReconciliation = reconcileChallenges(data.challenges, data);
  data.challenges = challengeReconciliation.challenges;

  challengeReconciliation.autoClaims.forEach((challenge) => {
    applyChallengeReward(data, challenge, rewardToasts, floatingRewards, { autoClaimed: true });
    rewardToasts.push(
      createToast(
        "coins",
        "Challenge auto-claimed",
        `${challenge.title} rolled over with unclaimed rewards — granted automatically.`,
      ),
    );
  });

  data.challenges = reconcileChallenges(data.challenges, data).challenges;

  let iterations = 0;
  while (iterations < 8) {
    iterations += 1;
    data.achievements = unlockAchievements(data);
    const pendingRewards = getPendingAchievementRewards(data.achievements);

    if (!pendingRewards.length) {
      break;
    }

    const rewardTime = new Date().toISOString();
    pendingRewards.forEach((achievement) => {
      if (achievement.reward.coins > 0) {
        appendCoins(
          data,
          achievement.reward.coins,
          achievement.title,
          rewardToasts,
          floatingRewards,
        );
      }

      if (achievement.reward.exp > 0) {
        appendExp(
          data,
          achievement.reward.exp,
          "achievement",
          achievement.title,
          rewardToasts,
          floatingRewards,
        );
      }

      rewardToasts.push(
        createToast("achievement", "Achievement unlocked", achievement.title),
      );

      data.achievements = data.achievements.map((entry) =>
        entry.id === achievement.id
          ? {
              ...entry,
              rewardedAt: rewardTime,
            }
          : entry,
      );
    });

    data.userProgress = syncWithShields(data);
    data.challenges = reconcileChallenges(data.challenges, data).challenges;
    data.questArcs = syncQuestArcs(
      data.questArcs,
      data,
      data.rewardSystems.progressSettledThroughDate,
    );
  }

  const unlockCheck = checkLevelUnlocks(data.levelUnlocks, data.userProgress.level);
  data.levelUnlocks = unlockCheck.levelUnlocks;
  unlockCheck.newlyUnlocked.forEach((unlock) => {
    rewardToasts.push(
      createToast(
        "unlock",
        "Feature unlocked",
        `${unlock.label} is now available at level ${unlock.requiredLevel}.`,
      ),
    );
  });

  return {
    data,
    rewardToasts,
    floatingRewards,
    celebration,
    settlementRecap,
  };
}

function mergeTransientState(
  state: HabitQuestStore,
  resolution: ResolutionResult,
) {
  const nextRecap = resolution.settlementRecap;
  let settlementRecap = state.settlementRecap;

  if (nextRecap) {
    // Never revive a recap the user already dismissed (or already saw this session).
    if (
      state.dismissedSettlementThroughDate === nextRecap.throughDate ||
      hasSeenSettlementRecap(nextRecap.throughDate)
    ) {
      settlementRecap = null;
    } else {
      settlementRecap = nextRecap;
    }
  }

  return {
    ...resolution.data,
    rewardToasts: [...state.rewardToasts, ...resolution.rewardToasts],
    floatingRewards: [...state.floatingRewards, ...resolution.floatingRewards],
    celebration: resolution.celebration ?? state.celebration,
    settlementRecap,
  };
}

function pushWarningState(state: HabitQuestStore, title: string, description: string) {
  return {
    rewardToasts: [
      createToast("warning", title, description),
      ...state.rewardToasts.filter((toast) => toast.type !== "warning" || toast.title !== title),
    ],
  };
}

const habitMutationSeq = new Map<string, number>();
const shopMutationSeq = new Map<string, number>();

function withHabitPending(
  current: Pick<HabitQuestStore, "pendingHabitIds" | "pendingHabitActions">,
  habitId: string,
  action: HabitPendingAction,
) {
  return {
    pendingHabitIds: current.pendingHabitIds.includes(habitId)
      ? current.pendingHabitIds
      : [...current.pendingHabitIds, habitId],
    pendingHabitActions: {
      ...current.pendingHabitActions,
      [habitId]: action,
    },
  };
}

function withoutHabitPending(
  current: Pick<HabitQuestStore, "pendingHabitIds" | "pendingHabitActions">,
  habitId: string,
) {
  const { [habitId]: _removed, ...pendingHabitActions } = current.pendingHabitActions;
  return {
    pendingHabitIds: current.pendingHabitIds.filter((id) => id !== habitId),
    pendingHabitActions,
  };
}

function nextHabitMutationSeq(habitId: string) {
  const next = (habitMutationSeq.get(habitId) ?? 0) + 1;
  habitMutationSeq.set(habitId, next);
  return next;
}

function isCurrentHabitMutation(habitId: string, seq: number) {
  return habitMutationSeq.get(habitId) === seq;
}

type QueuedHabitComplete = {
  habitId: string;
  seq: number;
  dateKey: string;
};

const COMPLETE_BATCH_MS = 140;
const completeFlushQueue = new Map<string, QueuedHabitComplete>();
let completeFlushTimer: ReturnType<typeof setTimeout> | null = null;

function rollbackHabitCompleteFailure(
  habitId: string,
  dateKey: string,
  error: string,
) {
  const rolledBack = persistLocalOnly(
    mergeHabitCompletionIntoState(projectData(useHabitQuestStore.getState()), {
      habitId,
      date: dateKey,
      completion: null,
      rewardSystems: useHabitQuestStore.getState().rewardSystems,
    }),
  );
  useHabitQuestStore.setState((current) => ({
    ...current,
    ...rolledBack,
    ...withoutHabitPending(current, habitId),
    ...pushWarningState(
      { ...current, ...rolledBack } as HabitQuestStore,
      "Clear failed",
      error,
    ),
  }));
}

function applyHabitCompleteSuccess(
  habitId: string,
  result: {
    habitId: string;
    date: string;
    completion: HabitQuestData["completions"][number] | null;
    rewardSystems: Pick<HabitQuestData["rewardSystems"], "todayCombo" | "comboDate">;
  },
) {
  const merged = mergeHabitCompletionIntoState(projectData(useHabitQuestStore.getState()), result);
  const resolution = resolveGameState(withLiveHabitMembership(merged));
  const persisted = persistLocalOnly(resolution.data);

  useHabitQuestStore.setState((current) => ({
    ...mergeTransientState(current, { ...resolution, data: persisted }),
    ...withoutHabitPending(current, habitId),
    rewardToasts: [...current.rewardToasts, ...resolution.rewardToasts],
    floatingRewards: [...current.floatingRewards, ...resolution.floatingRewards],
    celebration: resolution.celebration ?? current.celebration,
  }));
}

async function flushHabitCompletes() {
  const queued = [...completeFlushQueue.values()].filter((entry) =>
    isCurrentHabitMutation(entry.habitId, entry.seq),
  );
  completeFlushQueue.clear();
  if (!queued.length || !useHabitQuestStore.getState().authUser) {
    return;
  }

  const dateKey = queued[0]!.dateKey;
  const batch = queued.filter((entry) => entry.dateKey === dateKey);

  if (batch.length === 1) {
    const entry = batch[0]!;
    try {
      const result = await completeHabitRequest(entry.habitId, entry.dateKey);
      if (!isCurrentHabitMutation(entry.habitId, entry.seq)) {
        return;
      }
      if (result.status !== "ok") {
        rollbackHabitCompleteFailure(
          entry.habitId,
          entry.dateKey,
          result.status === "unauthenticated"
            ? "Sign in again to save habit clears."
            : result.error,
        );
        return;
      }
      applyHabitCompleteSuccess(entry.habitId, result);
    } catch (error) {
      if (!isCurrentHabitMutation(entry.habitId, entry.seq)) {
        return;
      }
      rollbackHabitCompleteFailure(
        entry.habitId,
        entry.dateKey,
        error instanceof Error ? error.message : "Network error while saving clear.",
      );
    }
    return;
  }

  const habitIds = batch.map((entry) => entry.habitId);
  const seqById = new Map(batch.map((entry) => [entry.habitId, entry.seq] as const));

  try {
    const result = await completeHabitsRequest(habitIds, dateKey);
    const stillCurrent = habitIds.filter((habitId) =>
      isCurrentHabitMutation(habitId, seqById.get(habitId) ?? -1),
    );
    if (!stillCurrent.length) {
      return;
    }

    if (result.status !== "ok") {
      const message =
        result.status === "unauthenticated"
          ? "Sign in again to save habit clears."
          : result.error;
      for (const habitId of stillCurrent) {
        rollbackHabitCompleteFailure(habitId, dateKey, message);
      }
      return;
    }

    const completedIds = new Set(result.completions.map((entry) => entry.habitId));
    const merged = mergeHabitCompletionsIntoState(projectData(useHabitQuestStore.getState()), {
      date: result.date,
      completions: result.completions.map((entry) => ({
        habitId: entry.habitId,
        completion: entry.completion,
      })),
      rewardSystems: result.rewardSystems,
    });
    const resolution = resolveGameState(withLiveHabitMembership(merged));
    const persisted = persistLocalOnly(resolution.data);

    useHabitQuestStore.setState((current) => {
      let pendingHabitIds = current.pendingHabitIds;
      let pendingHabitActions = current.pendingHabitActions;
      for (const habitId of stillCurrent) {
        if (!completedIds.has(habitId)) {
          continue;
        }
        const cleared = withoutHabitPending(
          { pendingHabitIds, pendingHabitActions },
          habitId,
        );
        pendingHabitIds = cleared.pendingHabitIds;
        pendingHabitActions = cleared.pendingHabitActions;
      }
      return {
        ...mergeTransientState(current, { ...resolution, data: persisted }),
        pendingHabitIds,
        pendingHabitActions,
        rewardToasts: [...current.rewardToasts, ...resolution.rewardToasts],
        floatingRewards: [...current.floatingRewards, ...resolution.floatingRewards],
        celebration: resolution.celebration ?? current.celebration,
      };
    });

    for (const habitId of stillCurrent) {
      if (!completedIds.has(habitId)) {
        rollbackHabitCompleteFailure(habitId, dateKey, "Clear was skipped by the server.");
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Network error while saving clears.";
    for (const entry of batch) {
      if (!isCurrentHabitMutation(entry.habitId, entry.seq)) {
        continue;
      }
      rollbackHabitCompleteFailure(entry.habitId, entry.dateKey, message);
    }
  }
}

function enqueueHabitComplete(habitId: string, seq: number, dateKey: string) {
  completeFlushQueue.set(habitId, { habitId, seq, dateKey });
  if (completeFlushTimer) {
    clearTimeout(completeFlushTimer);
  }
  completeFlushTimer = setTimeout(() => {
    completeFlushTimer = null;
    void flushHabitCompletes();
  }, COMPLETE_BATCH_MS);
}

function nextShopMutationSeq(key: string) {
  const next = (shopMutationSeq.get(key) ?? 0) + 1;
  shopMutationSeq.set(key, next);
  return next;
}

function isCurrentShopMutation(key: string, seq: number) {
  return shopMutationSeq.get(key) === seq;
}

function rollbackClaimFailure(
  snapshot: HabitQuestData,
  pendingKeys: string | string[],
  seqKey: string,
  seq: number,
  error: string,
) {
  if (!isCurrentShopMutation(seqKey, seq)) {
    return;
  }
  const keys = new Set(Array.isArray(pendingKeys) ? pendingKeys : [pendingKeys]);
  const rolledBack = persistLocalOnly(snapshot);
  bumpCloudSavePayload(rolledBack);
  useHabitQuestStore.setState((current) => ({
    ...current,
    ...rolledBack,
    pendingClaimIds: current.pendingClaimIds.filter((id) => !keys.has(id)),
    ...pushWarningState(
      { ...current, ...rolledBack } as HabitQuestStore,
      "Claim failed",
      error,
    ),
  }));
}

async function runClaimAgainstCloud(
  snapshot: HabitQuestData,
  pendingKeys: string | string[],
  seqKey: string,
  seq: number,
  claim: () => Promise<
    | { status: "ok"; wallet: HabitQuestData["wallet"]; userProgress: HabitQuestData["userProgress"]; challenges?: HabitQuestData["challenges"]; questArcs?: HabitQuestData["questArcs"]; seasonPass?: HabitQuestData["seasonPass"]; weeklyBoss?: HabitQuestData["weeklyBoss"]; rewardSystems?: HabitQuestData["rewardSystems"]; shopItems?: HabitQuestData["shopItems"] }
    | { status: "unauthenticated" }
    | { status: "error"; error: string }
  >,
  applyOk: (result: {
    wallet: HabitQuestData["wallet"];
    userProgress: HabitQuestData["userProgress"];
    challenges?: HabitQuestData["challenges"];
    questArcs?: HabitQuestData["questArcs"];
    seasonPass?: HabitQuestData["seasonPass"];
    weeklyBoss?: HabitQuestData["weeklyBoss"];
    rewardSystems?: HabitQuestData["rewardSystems"];
    shopItems?: HabitQuestData["shopItems"];
  }) => void,
) {
  const keys = new Set(Array.isArray(pendingKeys) ? pendingKeys : [pendingKeys]);
  if (!useHabitQuestStore.getState().authUser) {
    useHabitQuestStore.setState((current) => ({
      pendingClaimIds: current.pendingClaimIds.filter((id) => !keys.has(id)),
    }));
    return;
  }
  // Prefer surgical claim first. Full-save push is only a bootstrap for empty accounts —
  // pushing every claim can fail on Vercel when client local "yesterday" is still UTC "today".
  let result = await claim();
  if (
    result.status === "error" &&
    /no cloud save/i.test(result.error)
  ) {
    const ensured = await ensureCloudSavePushed(snapshot);
    if (!ensured.ok) {
      rollbackClaimFailure(snapshot, pendingKeys, seqKey, seq, ensured.error);
      return;
    }
    result = await claim();
  }

  if (!isCurrentShopMutation(seqKey, seq)) {
    return;
  }
  if (result.status !== "ok") {
    rollbackClaimFailure(
      snapshot,
      pendingKeys,
      seqKey,
      seq,
      result.status === "unauthenticated"
        ? "Sign in again to claim rewards."
        : result.error,
    );
    return;
  }

  applyOk(result);
}

export const useHabitQuestStore = create<HabitQuestStore>((set, get) => ({
  ...initialData,
  hydrated: false,
  authChecked: false,
  authUser: null,
  guestPlay: false,
  pendingHabitIds: [],
  pendingHabitActions: {},
  pendingShopItemIds: [],
  pendingClaimIds: [],
  rewardToasts: [],
  floatingRewards: [],
  celebration: null,
  settlementRecap: null,
  dismissedSettlementThroughDate: null,
  hydrate: () => {
    if (get().hydrated) {
      return;
    }

    const data = loadHabitQuestData();
    const resolution = resolveGameState(data, { processDailyLogin: true });
    const persisted = persistData(resolution.data);
    const dismissed = get().dismissedSettlementThroughDate;

    set({
      ...persisted,
      hydrated: true,
      rewardToasts: resolution.rewardToasts,
      floatingRewards: resolution.floatingRewards,
      celebration: resolution.celebration,
      settlementRecap: acceptSettlementRecap(resolution.settlementRecap, dismissed),
    });
  },
  setAuthChecked: (checked) => {
    set({ authChecked: checked });
  },
  setAuthUser: (user) => {
    if (user) {
      setLocalPersistenceEnabled(false);
      cacheAuthUser(user);
      setGuestPlayEnabled(false);
      set({ authUser: user, guestPlay: false });
      return;
    }
    setLocalPersistenceEnabled(true);
    clearCachedAuthUser();
    set({ authUser: null });
  },
  startGuestPlay: () => {
    setCloudSyncEnabled(false);
    setLocalPersistenceEnabled(true);
    setGuestPlayEnabled(true);
    clearCachedAuthUser();
    set({ authUser: null, guestPlay: true, authChecked: true });
    get().hydrate();
  },
  exitGuestPlay: () => {
    setGuestPlayEnabled(false);
    set({ guestPlay: false });
  },
  projectSave: () => projectData(get()),
  applyRemoteSave: (data, options = {}) => {
    const resolution = resolveGameState(data, {
      processDailyLogin: options.processDailyLogin ?? false,
    });
    const persisted = persistData(resolution.data);

    set({
      ...persisted,
      hydrated: true,
      rewardToasts: [
        ...get().rewardToasts,
        ...resolution.rewardToasts,
      ],
      floatingRewards: [
        ...get().floatingRewards,
        ...resolution.floatingRewards,
      ],
      celebration: resolution.celebration ?? get().celebration,
      settlementRecap: (() => {
        const accepted = acceptSettlementRecap(
          resolution.settlementRecap,
          get().dismissedSettlementThroughDate,
        );
        if (resolution.settlementRecap) {
          return accepted;
        }
        return get().settlementRecap;
      })(),
    });
  },
  applyAuthenticatedSave: (data, options = {}) => {
    setLocalPersistenceEnabled(false);

    const claimedBefore = data.dailyRewards.claimedDailyLoginDate;
    const comebackBefore = data.rewardSystems.lastComebackDate;
    const settledBefore = data.rewardSystems.progressSettledThroughDate;
    const resolution = resolveGameState(data, {
      processDailyLogin: options.processDailyLogin ?? false,
    });
    // Keep a durable browser cache so purchases survive refresh races.
    saveHabitQuestData(resolution.data);

    const claimedAfter = resolution.data.dailyRewards.claimedDailyLoginDate;
    const loginJustClaimed =
      Boolean(claimedAfter) && claimedAfter !== claimedBefore;
    const comebackJustClaimed =
      Boolean(resolution.data.rewardSystems.lastComebackDate) &&
      resolution.data.rewardSystems.lastComebackDate !== comebackBefore;
    const settlementJustApplied =
      Boolean(resolution.settlementRecap) ||
      resolution.data.rewardSystems.progressSettledThroughDate !== settledBefore;

    // Daily login / day-settlement (comeback) must hit the cloud immediately —
    // a debounced push is what made refresh re-grant rewards every time.
    if (loginJustClaimed || comebackJustClaimed || settlementJustApplied) {
      void flushCloudSaveNow(resolution.data);
    } else {
      scheduleCloudSave(resolution.data);
    }

    const dismissed = get().dismissedSettlementThroughDate;

    set({
      ...resolution.data,
      hydrated: true,
      authChecked: true,
      rewardToasts: resolution.rewardToasts,
      floatingRewards: resolution.floatingRewards,
      celebration: resolution.celebration,
      settlementRecap: acceptSettlementRecap(resolution.settlementRecap, dismissed),
    });
  },
  createHabit: (rawValues) => {
    const state = get();
    const mutation = applyCreateHabit(projectData(state), rawValues);
    if (!mutation.ok || !mutation.habit) {
      set((current) => ({
        ...current,
        ...pushWarningState(
          current,
          "Couldn’t create habit",
          mutation.ok ? "Missing habit." : mutation.error,
        ),
      }));
      return;
    }

    const habitId = mutation.habitId;
    const seq = nextHabitMutationSeq(habitId);
    const resolution = resolveGameState(mutation.data);
    const persisted = persistLocalOnly(resolution.data);
    bumpCloudSavePayload(persisted);

    set((current) => ({
      ...mergeTransientState(current, { ...resolution, data: persisted }),
      ...withHabitPending(current, habitId, "create"),
    }));

    if (!get().authUser) {
      set((current) => ({
        ...current,
        ...withoutHabitPending(current, habitId),
      }));
      return;
    }

    void createHabitRequest(rawValues, habitId)
      .then((result) => {
        if (!isCurrentHabitMutation(habitId, seq)) {
          return;
        }
        if (result.status !== "ok") {
          const restored = persistLocalOnly({
            ...projectData(get()),
            habits: get().habits.filter((entry) => entry.id !== habitId),
          });
          bumpCloudSavePayload(restored);
          set((current) => ({
            ...current,
            ...restored,
            ...withoutHabitPending(current, habitId),
            ...pushWarningState(
              { ...current, ...restored } as HabitQuestStore,
              "Sync failed",
              result.status === "unauthenticated"
                ? "Sign in again to save habits."
                : result.error,
            ),
          }));
          return;
        }

        set((current) => ({
          ...current,
          ...withoutHabitPending(current, habitId),
          habits: result.habit
            ? current.habits.map((entry) => (entry.id === habitId ? result.habit! : entry))
            : current.habits,
        }));
      })
      .catch((error) => {
        if (!isCurrentHabitMutation(habitId, seq)) {
          return;
        }
        const restored = persistLocalOnly({
          ...projectData(get()),
          habits: get().habits.filter((entry) => entry.id !== habitId),
        });
        bumpCloudSavePayload(restored);
        set((current) => ({
          ...current,
          ...restored,
          ...withoutHabitPending(current, habitId),
          ...pushWarningState(
            { ...current, ...restored } as HabitQuestStore,
            "Sync failed",
            error instanceof Error ? error.message : "Network error while creating habit.",
          ),
        }));
      });
  },
  updateHabit: (habitId, rawValues) => {
    const state = get();
    if (state.pendingHabitIds.includes(habitId)) {
      return;
    }

    const snapshot = projectData(state);
    const mutation = applyUpdateHabit(snapshot, habitId, rawValues);
    if (!mutation.ok) {
      set((current) => ({
        ...current,
        ...pushWarningState(current, "Couldn’t update habit", mutation.error),
      }));
      return;
    }

    const seq = nextHabitMutationSeq(habitId);
    const resolution = resolveGameState(mutation.data);
    const persisted = persistLocalOnly(resolution.data);
    bumpCloudSavePayload(persisted);

    set((current) => ({
      ...mergeTransientState(current, { ...resolution, data: persisted }),
      ...withHabitPending(current, habitId, "update"),
    }));

    if (!get().authUser) {
      set((current) => ({
        ...current,
        ...withoutHabitPending(current, habitId),
      }));
      return;
    }

    void updateHabitRequest(habitId, rawValues)
      .then((result) => {
        if (!isCurrentHabitMutation(habitId, seq)) {
          return;
        }
        if (result.status !== "ok") {
          const rolledBack = persistLocalOnly(snapshot);
          bumpCloudSavePayload(rolledBack);
          set((current) => ({
            ...current,
            ...rolledBack,
            ...withoutHabitPending(current, habitId),
            ...pushWarningState(
              { ...current, ...rolledBack } as HabitQuestStore,
              "Sync failed",
              result.status === "unauthenticated"
                ? "Sign in again to save habits."
                : result.error,
            ),
          }));
          return;
        }

        set((current) => {
          const nextData = persistLocalOnly({
            ...projectData(current),
            habits: result.habit
              ? current.habits.map((entry) => (entry.id === habitId ? result.habit! : entry))
              : current.habits,
          });
          bumpCloudSavePayload(nextData);
          return {
            ...current,
            ...nextData,
            ...withoutHabitPending(current, habitId),
          };
        });
      })
      .catch((error) => {
        if (!isCurrentHabitMutation(habitId, seq)) {
          return;
        }
        const rolledBack = persistLocalOnly(snapshot);
        bumpCloudSavePayload(rolledBack);
        set((current) => ({
          ...current,
          ...rolledBack,
          ...withoutHabitPending(current, habitId),
          ...pushWarningState(
            { ...current, ...rolledBack } as HabitQuestStore,
            "Sync failed",
            error instanceof Error ? error.message : "Network error while updating habit.",
          ),
        }));
      });
  },
  deleteHabit: (habitId) => {
    const state = get();
    if (state.pendingHabitIds.includes(habitId)) {
      return;
    }

    const snapshot = projectData(state);
    const mutation = applyDeleteHabit(snapshot, habitId);
    if (!mutation.ok) {
      set((current) => ({
        ...current,
        ...pushWarningState(current, "Couldn’t delete habit", mutation.error),
      }));
      return;
    }

    const seq = nextHabitMutationSeq(habitId);
    if (!get().authUser) {
      const resolution = resolveGameState(
        withLiveHabitMembership(mutation.data, { excludeHabitId: habitId }),
      );
      const persisted = persistLocalOnly(resolution.data);
      set((current) => ({
        ...mergeTransientState(current, { ...resolution, data: persisted }),
      }));
      return;
    }

    set((current) => ({
      ...current,
      ...withHabitPending(current, habitId, "delete"),
    }));

    void deleteHabitRequest(habitId)
      .then((result) => {
        if (!isCurrentHabitMutation(habitId, seq)) {
          return;
        }
        if (result.status !== "ok") {
          set((current) => ({
            ...current,
            ...withoutHabitPending(current, habitId),
            ...pushWarningState(
              current,
              "Delete failed",
              result.status === "unauthenticated"
                ? "Sign in again to save habits."
                : result.error,
            ),
          }));
          return;
        }

        const resolution = resolveGameState(
          withLiveHabitMembership(mutation.data, { excludeHabitId: habitId }),
        );
        const persisted = persistLocalOnly(resolution.data);
        bumpCloudSavePayload(persisted);
        scheduleCloudSave(persisted);
        set((current) => ({
          ...mergeTransientState(current, { ...resolution, data: persisted }),
          ...withoutHabitPending(current, habitId),
          userProgress: result.userProgress
            ? { ...persisted.userProgress, ...result.userProgress }
            : persisted.userProgress,
        }));
      })
      .catch((error) => {
        if (!isCurrentHabitMutation(habitId, seq)) {
          return;
        }
        set((current) => ({
          ...current,
          ...withoutHabitPending(current, habitId),
          ...pushWarningState(
            current,
            "Delete failed",
            error instanceof Error ? error.message : "Network error while deleting habit.",
          ),
        }));
      });
  },
  completeHabitForToday: (habitId) => {
    const state = get();
    if (state.pendingHabitIds.includes(habitId)) {
      return;
    }

    const today = getTodayDateKey();
    const snapshot = projectData(state);
    const mutation = applyCompleteHabitForToday(snapshot, habitId, today);
    if (!mutation.ok) {
      return;
    }

    const seq = nextHabitMutationSeq(habitId);
    const optimisticResolution = resolveGameState(mutation.data);
    const optimisticPersisted = persistLocalOnly(optimisticResolution.data);

    set((current) => ({
      ...mergeTransientState(current, { ...optimisticResolution, data: optimisticPersisted }),
      ...withHabitPending(current, habitId, "complete"),
      rewardToasts: [...current.rewardToasts, ...mutation.rewardToasts],
      floatingRewards: [
        ...current.floatingRewards,
        ...optimisticResolution.floatingRewards,
      ],
      celebration: mutation.celebration ?? optimisticResolution.celebration,
    }));

    if (!get().authUser) {
      set((current) => ({
        ...current,
        ...withoutHabitPending(current, habitId),
      }));
      return;
    }

    enqueueHabitComplete(habitId, seq, today);
  },
  uncompleteHabitForToday: (habitId) => {
    const state = get();
    if (state.pendingHabitIds.includes(habitId)) {
      return;
    }

    completeFlushQueue.delete(habitId);

    const today = getTodayDateKey();
    const snapshot = projectData(state);
    const mutation = applyUncompleteHabitForToday(snapshot, habitId, today);
    if (!mutation.ok) {
      return;
    }

    const seq = nextHabitMutationSeq(habitId);
    const optimisticResolution = resolveGameState(mutation.data);
    const optimisticPersisted = persistLocalOnly(optimisticResolution.data);

    set((current) => ({
      ...mergeTransientState(current, { ...optimisticResolution, data: optimisticPersisted }),
      ...withHabitPending(current, habitId, "uncomplete"),
      rewardToasts: [...current.rewardToasts, ...mutation.rewardToasts],
    }));

    if (!get().authUser) {
      set((current) => ({
        ...current,
        ...withoutHabitPending(current, habitId),
      }));
      return;
    }

    void uncompleteHabitRequest(habitId, today)
      .then((result) => {
        if (!isCurrentHabitMutation(habitId, seq)) {
          return;
        }

        if (result.status !== "ok") {
          const priorCompletion = snapshot.completions.find(
            (entry) => entry.habitId === habitId && entry.date === today,
          );
          const rolledBack = persistLocalOnly(
            mergeHabitCompletionIntoState(projectData(get()), {
              habitId,
              date: today,
              completion: priorCompletion ?? null,
              rewardSystems: snapshot.rewardSystems,
            }),
          );
          set((current) => ({
            ...current,
            ...rolledBack,
            ...withoutHabitPending(current, habitId),
            ...pushWarningState(
              { ...current, ...rolledBack } as HabitQuestStore,
              "Undo failed",
              result.status === "unauthenticated"
                ? "Sign in again to sync habit undos."
                : result.error,
            ),
          }));
          return;
        }

        const merged = mergeHabitCompletionIntoState(projectData(get()), result);
        const resolution = resolveGameState(withLiveHabitMembership(merged));
        const persisted = persistLocalOnly(resolution.data);

        set((current) => ({
          ...mergeTransientState(current, { ...resolution, data: persisted }),
          ...withoutHabitPending(current, habitId),
          rewardToasts: [...current.rewardToasts, ...resolution.rewardToasts],
        }));
      })
      .catch((error) => {
        if (!isCurrentHabitMutation(habitId, seq)) {
          return;
        }
        const priorCompletion = snapshot.completions.find(
          (entry) => entry.habitId === habitId && entry.date === today,
        );
        const rolledBack = persistLocalOnly(
          mergeHabitCompletionIntoState(projectData(get()), {
            habitId,
            date: today,
            completion: priorCompletion ?? null,
            rewardSystems: snapshot.rewardSystems,
          }),
        );
        set((current) => ({
          ...current,
          ...rolledBack,
          ...withoutHabitPending(current, habitId),
          ...pushWarningState(
            { ...current, ...rolledBack } as HabitQuestStore,
            "Undo failed",
            error instanceof Error ? error.message : "Network error while undoing clear.",
          ),
        }));
      });
  },
  claimChallengeReward: (challengeId) => {
    const state = get();
    const pendingKey = `challenge:${challengeId}`;
    if (state.pendingClaimIds.includes(pendingKey)) {
      return;
    }
    const snapshot = projectData(state);
    const mutation = applyClaimChallengeReward(snapshot, challengeId);
    if (!mutation.ok) {
      return;
    }

    const seqKey = `challenge:${challengeId}`;
    const seq = nextShopMutationSeq(seqKey);
    const resolution = resolveGameState(withLiveHabitMembership(mutation.data));
    const persisted = persistLocalOnly(resolution.data);
    bumpCloudSavePayload(persisted);

    set((current) => ({
      ...mergeTransientState(current, { ...resolution, data: persisted }),
      pendingClaimIds: [...current.pendingClaimIds, pendingKey],
      rewardToasts: [
        ...current.rewardToasts,
        ...mutation.rewardToasts,
        ...resolution.rewardToasts,
      ],
      floatingRewards: [
        ...current.floatingRewards,
        ...resolution.floatingRewards,
      ],
    }));

    void runClaimAgainstCloud(
      snapshot,
      pendingKey,
      seqKey,
      seq,
      () => claimChallengeRewardRequest(challengeId),
      (result) => {
        set((current) => {
          const nextData = persistLocalOnly({
            ...projectData(current),
            wallet: result.wallet,
            userProgress: result.userProgress,
            challenges: result.challenges ?? current.challenges,
            shopItems: result.shopItems ?? current.shopItems,
          });
          bumpCloudSavePayload(nextData);
          return {
            ...current,
            ...nextData,
            pendingClaimIds: current.pendingClaimIds.filter((id) => id !== pendingKey),
          };
        });
      },
    );
  },
  claimQuestArcReward: (arcId) => {
    const state = get();
    const pendingKey = `quest:${arcId}`;
    if (state.pendingClaimIds.includes(pendingKey)) {
      return;
    }
    const snapshot = projectData(state);
    const mutation = applyClaimQuestArcReward(snapshot, arcId);
    if (!mutation.ok) {
      set((current) => ({
        ...current,
        ...pushWarningState(current, "Claim blocked", mutation.error),
      }));
      return;
    }

    const arc = mutation.data.questArcs.find((entry) => entry.id === arcId);
    const seqKey = `quest:${arcId}`;
    const seq = nextShopMutationSeq(seqKey);
    const resolution = resolveGameState(mutation.data);
    const persisted = persistLocalOnly(resolution.data);
    bumpCloudSavePayload(persisted);

    set((current) => ({
      ...mergeTransientState(current, { ...resolution, data: persisted }),
      pendingClaimIds: [...current.pendingClaimIds, pendingKey],
      rewardToasts: [
        ...current.rewardToasts,
        ...mutation.rewardToasts,
        ...resolution.rewardToasts,
      ],
      floatingRewards: [
        ...current.floatingRewards,
        ...resolution.floatingRewards,
      ],
      celebration: createCelebration(
        "quest-chapter",
        arc?.title ?? "Quest chapter",
        "Chapter complete — rewards claimed.",
      ),
    }));

    void runClaimAgainstCloud(
      snapshot,
      pendingKey,
      seqKey,
      seq,
      () => claimQuestArcRewardRequest(arcId),
      (result) => {
        set((current) => {
          const nextData = persistLocalOnly({
            ...projectData(current),
            wallet: result.wallet,
            userProgress: result.userProgress,
            questArcs: result.questArcs ?? current.questArcs,
            shopItems: result.shopItems ?? current.shopItems,
          });
          bumpCloudSavePayload(nextData);
          return {
            ...current,
            ...nextData,
            pendingClaimIds: current.pendingClaimIds.filter((id) => id !== pendingKey),
          };
        });
      },
    );
  },
  claimSeasonPassLevel: (level) => {
    const state = get();
    const pendingKey = `season:${level}`;
    if (state.pendingClaimIds.includes(pendingKey)) {
      return;
    }
    const snapshot = projectData(state);
    const mutation = applyClaimSeasonPassLevel(snapshot, level);
    if (!mutation.ok) {
      set((current) => ({
        ...current,
        ...pushWarningState(current, "Claim blocked", mutation.error),
      }));
      return;
    }

    const reward = mutation.data.seasonPass.rewards.find((entry) => entry.level === level);
    const seqKey = `season:${level}`;
    const seq = nextShopMutationSeq(seqKey);
    const resolution = resolveGameState(mutation.data);
    const persisted = persistLocalOnly(resolution.data);
    bumpCloudSavePayload(persisted);

    set((current) => ({
      ...mergeTransientState(current, { ...resolution, data: persisted }),
      pendingClaimIds: [...current.pendingClaimIds, pendingKey],
      rewardToasts: [
        ...current.rewardToasts,
        ...mutation.rewardToasts,
        ...resolution.rewardToasts,
      ],
      floatingRewards: [
        ...current.floatingRewards,
        ...resolution.floatingRewards,
      ],
      celebration: createCelebration(
        "season-level",
        `Season reward · Lv ${level}`,
        reward?.label ?? "Season reward claimed.",
      ),
    }));

    void runClaimAgainstCloud(
      snapshot,
      pendingKey,
      seqKey,
      seq,
      () => claimSeasonPassLevelRequest(level),
      (result) => {
        set((current) => {
          const nextData = persistLocalOnly({
            ...projectData(current),
            wallet: result.wallet,
            userProgress: result.userProgress,
            seasonPass: result.seasonPass ?? current.seasonPass,
            rewardSystems: result.rewardSystems ?? current.rewardSystems,
            shopItems: result.shopItems ?? current.shopItems,
          });
          bumpCloudSavePayload(nextData);
          return {
            ...current,
            ...nextData,
            pendingClaimIds: current.pendingClaimIds.filter((id) => id !== pendingKey),
          };
        });
      },
    );
  },
  claimAllRewards: (kinds) => {
    const state = get();
    const snapshot = projectData(state);
    const claimables = listClaimableRewards(snapshot).filter(
      (item) => !kinds?.length || kinds.includes(item.kind),
    );
    if (!claimables.length) {
      return;
    }

    const pendingKeys = claimables.map((item) => item.id);
    if (
      state.pendingClaimIds.includes("claim-all") ||
      pendingKeys.some((key) => state.pendingClaimIds.includes(key))
    ) {
      return;
    }

    const mutation = applyClaimAllRewards(snapshot, kinds);
    if (!mutation.ok) {
      set((current) => ({
        ...current,
        ...pushWarningState(current, "Claim blocked", mutation.error),
      }));
      return;
    }

    const seqKey = kinds?.length ? `claim-all:${kinds.join(",")}` : "claim-all";
    const seq = nextShopMutationSeq(seqKey);
    const resolution = resolveGameState(withLiveHabitMembership(mutation.data));
    const persisted = persistLocalOnly(resolution.data);
    bumpCloudSavePayload(persisted);

    const seasonCount = claimables.filter((item) => item.kind === "season").length;

    set((current) => ({
      ...mergeTransientState(current, { ...resolution, data: persisted }),
      pendingClaimIds: [...current.pendingClaimIds, "claim-all", ...pendingKeys],
      rewardToasts: [
        ...current.rewardToasts,
        ...mutation.rewardToasts,
        ...resolution.rewardToasts,
      ],
      floatingRewards: [
        ...current.floatingRewards,
        ...resolution.floatingRewards,
      ],
      celebration:
        seasonCount > 1
          ? createCelebration(
              "season-level",
              `Claimed ${seasonCount} season rewards`,
              "Season track blessings gathered.",
            )
          : claimables.length > 1
            ? createCelebration(
                "quest-chapter",
                `Claimed ${claimables.length} rewards`,
                "All waiting blessings gathered.",
              )
            : resolution.celebration ?? current.celebration,
    }));

    void runClaimAgainstCloud(
      snapshot,
      ["claim-all", ...pendingKeys],
      seqKey,
      seq,
      () => claimAllRewardsRequest(kinds),
      (result) => {
        set((current) => {
          const nextData = persistLocalOnly({
            ...projectData(current),
            wallet: result.wallet,
            userProgress: result.userProgress,
            challenges: result.challenges ?? current.challenges,
            questArcs: result.questArcs ?? current.questArcs,
            seasonPass: result.seasonPass ?? current.seasonPass,
            weeklyBoss: result.weeklyBoss ?? current.weeklyBoss,
            rewardSystems: result.rewardSystems ?? current.rewardSystems,
            shopItems: result.shopItems ?? current.shopItems,
          });
          bumpCloudSavePayload(nextData);
          const clearKeys = new Set(["claim-all", ...pendingKeys]);
          return {
            ...current,
            ...nextData,
            pendingClaimIds: current.pendingClaimIds.filter((id) => !clearKeys.has(id)),
          };
        });
      },
    );
  },
  claimBossReward: () => {
    const state = get();
    const pendingKey = "boss-reward";
    if (state.pendingClaimIds.includes(pendingKey)) {
      return;
    }
    const snapshot = projectData(state);
    const mutation = applyClaimBossReward(snapshot);
    if (!mutation.ok) {
      return;
    }

    const seqKey = "boss-reward";
    const seq = nextShopMutationSeq(seqKey);
    const resolution = resolveGameState(mutation.data);
    const persisted = persistLocalOnly(resolution.data);
    bumpCloudSavePayload(persisted);

    set((current) => ({
      ...mergeTransientState(current, { ...resolution, data: persisted }),
      pendingClaimIds: [...current.pendingClaimIds, pendingKey],
      rewardToasts: [
        ...current.rewardToasts,
        ...mutation.rewardToasts,
        ...resolution.rewardToasts,
      ],
      floatingRewards: [
        ...current.floatingRewards,
        ...resolution.floatingRewards,
      ],
      celebration: createCelebration(
        "boss-clear",
        "Boss reward claimed",
        `${snapshot.weeklyBoss.name} bounty secured.`,
      ),
    }));

    void runClaimAgainstCloud(
      snapshot,
      pendingKey,
      seqKey,
      seq,
      () => claimBossRewardRequest(),
      (result) => {
        set((current) => {
          const nextData = persistLocalOnly({
            ...projectData(current),
            wallet: result.wallet,
            userProgress: result.userProgress,
            weeklyBoss: result.weeklyBoss ?? current.weeklyBoss,
            rewardSystems: result.rewardSystems ?? current.rewardSystems,
          });
          bumpCloudSavePayload(nextData);
          return {
            ...current,
            ...nextData,
            pendingClaimIds: current.pendingClaimIds.filter((id) => id !== pendingKey),
          };
        });
      },
    );
  },
  buyStreakFreeze: () => {
    const state = get();
    const pendingKey = "streak-freeze";
    if (state.pendingClaimIds.includes(pendingKey)) {
      return;
    }
    const snapshot = projectData(state);
    const mutation = applyBuyStreakFreeze(snapshot);
    if (!mutation.ok) {
      set((current) => ({
        ...current,
        ...pushWarningState(current, "Purchase blocked", mutation.error),
      }));
      return;
    }

    const seqKey = "streak-freeze";
    const seq = nextShopMutationSeq(seqKey);
    const resolution = resolveGameState(withLiveHabitMembership(mutation.data));
    const persisted = persistLocalOnly(resolution.data);
    bumpCloudSavePayload(persisted);
    set((current) => ({
      ...mergeTransientState(current, { ...resolution, data: persisted }),
      pendingClaimIds: [...current.pendingClaimIds, pendingKey],
      rewardToasts: [
        ...current.rewardToasts,
        ...mutation.rewardToasts,
        ...resolution.rewardToasts,
      ],
    }));

    void runClaimAgainstCloud(
      snapshot,
      pendingKey,
      seqKey,
      seq,
      () => buyStreakFreezeRequest(),
      (result) => {
        const confirmed = resolveGameState(
          withLiveHabitMembership({
            ...mutation.data,
            wallet: result.wallet,
            rewardSystems: result.rewardSystems ?? mutation.data.rewardSystems,
          }),
        );
        const nextData = persistLocalOnly(confirmed.data);
        bumpCloudSavePayload(nextData);
        set((current) => ({
          ...mergeTransientState(current, { ...confirmed, data: nextData }),
          pendingClaimIds: current.pendingClaimIds.filter((id) => id !== pendingKey),
        }));
      },
    );
  },
  purchaseShopItem: (itemId) => {
    const state = get();
    if (state.pendingShopItemIds.includes(itemId)) {
      return;
    }

    const snapshot = projectData(state);
    const mutation = applyPurchaseShopItem(snapshot, itemId);
    if (!mutation.ok) {
      set((current) => ({
        ...current,
        ...pushWarningState(current, "Purchase blocked", mutation.error),
      }));
      return;
    }

    const itemName =
      state.shopItems.find((entry) => entry.id === itemId)?.name ?? "Item";
    if (!get().authUser) {
      const resolution = resolveGameState(withLiveHabitMembership(mutation.data));
      const persisted = persistLocalOnly(resolution.data);
      set((current) => ({
        ...mergeTransientState(current, { ...resolution, data: persisted }),
        rewardToasts: [
          ...current.rewardToasts,
          createToast("shop", "Purchase successful", `${itemName} added to inventory.`),
          ...resolution.rewardToasts,
        ],
      }));
      return;
    }

    const seq = nextShopMutationSeq(itemId);
    set((current) => ({
      ...current,
      pendingShopItemIds: [...current.pendingShopItemIds, itemId],
    }));

    void purchaseShopItemRequest(itemId)
      .then((result) => {
        if (!isCurrentShopMutation(itemId, seq)) {
          return;
        }

        if (result.status !== "ok") {
          set((current) => ({
            ...current,
            pendingShopItemIds: current.pendingShopItemIds.filter((id) => id !== itemId),
            ...pushWarningState(
              current,
              "Purchase failed",
              result.status === "unauthenticated"
                ? "Sign in again to save purchases."
                : result.error,
            ),
          }));
          return;
        }

        const resolution = resolveGameState(
          withLiveHabitMembership({
            ...mutation.data,
            shopItems: mutation.data.shopItems.map((entry) =>
              entry.id === result.itemId ? { ...entry, owned: true } : entry,
            ),
            wallet: result.wallet,
          }),
        );
        const persisted = persistLocalOnly(resolution.data);
        bumpCloudSavePayload(persisted);

        set((current) => ({
          ...mergeTransientState(current, { ...resolution, data: persisted }),
          pendingShopItemIds: current.pendingShopItemIds.filter((id) => id !== itemId),
          rewardToasts: [
            ...current.rewardToasts,
            createToast("shop", "Purchase successful", `${itemName} added to inventory.`),
            ...resolution.rewardToasts,
          ],
        }));
      })
      .catch((error) => {
        if (!isCurrentShopMutation(itemId, seq)) {
          return;
        }
        set((current) => ({
          ...current,
          pendingShopItemIds: current.pendingShopItemIds.filter((id) => id !== itemId),
          ...pushWarningState(
            current,
            "Purchase failed",
            error instanceof Error ? error.message : "Network error while purchasing.",
          ),
        }));
      });
  },
  equipShopItem: (itemId) => {
    const state = get();
    if (state.pendingShopItemIds.includes(itemId)) {
      return;
    }

    const snapshot = projectData(state);
    const mutation = applyEquipShopItem(snapshot, itemId);
    if (!mutation.ok) {
      set((current) => ({
        ...current,
        ...pushWarningState(current, "Equip blocked", mutation.error),
      }));
      return;
    }

    const itemName =
      state.shopItems.find((entry) => entry.id === itemId)?.name ?? "Item";
    if (!get().authUser) {
      const persisted = persistLocalOnly(withLiveHabitMembership(mutation.data));
      set((current) => ({
        ...current,
        ...persisted,
        rewardToasts: [
          ...current.rewardToasts,
          createToast("shop", "Equipped", `${itemName} is now active.`),
        ],
      }));
      return;
    }

    const seq = nextShopMutationSeq(itemId);
    set((current) => ({
      ...current,
      pendingShopItemIds: [...current.pendingShopItemIds, itemId],
    }));

    void equipShopItemRequest(itemId)
      .then((result) => {
        if (!isCurrentShopMutation(itemId, seq)) {
          return;
        }

        if (result.status !== "ok") {
          set((current) => ({
            ...current,
            pendingShopItemIds: current.pendingShopItemIds.filter((id) => id !== itemId),
            ...pushWarningState(
              current,
              "Equip failed",
              result.status === "unauthenticated"
                ? "Sign in again to save equipment."
                : result.error,
            ),
          }));
          return;
        }

        const persisted = persistLocalOnly(
          withLiveHabitMembership({
            ...mutation.data,
            equippedItems: result.equippedItems,
          }),
        );
        bumpCloudSavePayload(persisted);

        set((current) => ({
          ...current,
          ...persisted,
          pendingShopItemIds: current.pendingShopItemIds.filter((id) => id !== itemId),
          rewardToasts: [
            ...current.rewardToasts,
            createToast("shop", "Equipped", `${itemName} is now active.`),
          ],
        }));
      })
      .catch((error) => {
        if (!isCurrentShopMutation(itemId, seq)) {
          return;
        }
        set((current) => ({
          ...current,
          pendingShopItemIds: current.pendingShopItemIds.filter((id) => id !== itemId),
          ...pushWarningState(
            current,
            "Equip failed",
            error instanceof Error ? error.message : "Network error while equipping.",
          ),
        }));
      });
  },
  unequipShopItem: (category) => {
    const state = get();
    const pendingKey = `unequip:${category}`;
    if (state.pendingShopItemIds.includes(pendingKey)) {
      return;
    }

    const snapshot = projectData(state);
    const mutation = applyUnequipShopItem(snapshot, category);
    if (!mutation.ok) {
      set((current) => ({
        ...current,
        ...pushWarningState(current, "Unequip blocked", mutation.error),
      }));
      return;
    }

    const seq = nextShopMutationSeq(pendingKey);
    if (!get().authUser) {
      const persisted = persistLocalOnly(withLiveHabitMembership(mutation.data));
      set((current) => ({
        ...current,
        ...persisted,
        rewardToasts: [
          ...current.rewardToasts,
          createToast("shop", "Unequipped", `${category} slot cleared.`),
        ],
      }));
      return;
    }

    set((current) => ({
      ...current,
      pendingShopItemIds: [...current.pendingShopItemIds, pendingKey],
    }));

    void unequipShopItemRequest(category)
      .then((result) => {
        if (!isCurrentShopMutation(pendingKey, seq)) {
          return;
        }

        if (result.status !== "ok") {
          set((current) => ({
            ...current,
            pendingShopItemIds: current.pendingShopItemIds.filter((id) => id !== pendingKey),
            ...pushWarningState(
              current,
              "Unequip failed",
              result.status === "unauthenticated"
                ? "Sign in again to save equipment."
                : result.error,
            ),
          }));
          return;
        }

        const persisted = persistLocalOnly(
          withLiveHabitMembership({
            ...mutation.data,
            equippedItems: result.equippedItems,
          }),
        );
        bumpCloudSavePayload(persisted);

        set((current) => ({
          ...current,
          ...persisted,
          pendingShopItemIds: current.pendingShopItemIds.filter((id) => id !== pendingKey),
          rewardToasts: [
            ...current.rewardToasts,
            createToast("shop", "Unequipped", `${category} slot cleared.`),
          ],
        }));
      })
      .catch((error) => {
        if (!isCurrentShopMutation(pendingKey, seq)) {
          return;
        }
        set((current) => ({
          ...current,
          pendingShopItemIds: current.pendingShopItemIds.filter((id) => id !== pendingKey),
          ...pushWarningState(
            current,
            "Unequip failed",
            error instanceof Error ? error.message : "Network error while unequipping.",
          ),
        }));
      });
  },
  updateSettings: (patch) => {
    const state = get();
    const snapshot = projectData(state);
    const mutation = applyUpdateSettings(snapshot, patch);
    const persisted = persistLocalOnly(withLiveHabitMembership(mutation.data));
    bumpCloudSavePayload(persisted);

    set((current) => ({
      ...current,
      ...persisted,
    }));

    if (!get().authUser) {
      return;
    }

    void updateSettingsRequest(patch).then((result) => {
      if (result.status !== "ok") {
        const rolledBack = persistLocalOnly(snapshot);
        bumpCloudSavePayload(rolledBack);
        set((current) => ({
          ...current,
          ...rolledBack,
          ...pushWarningState(
            { ...current, ...rolledBack } as HabitQuestStore,
            "Settings sync failed",
            result.status === "unauthenticated"
              ? "Sign in again to save settings."
              : result.error,
          ),
        }));
        return;
      }
      set((current) => {
        const nextData = persistLocalOnly({
          ...projectData(current),
          settings: result.settings,
        });
        bumpCloudSavePayload(nextData);
        return { ...current, ...nextData };
      });
    });
  },
  completeOnboarding: (displayName) => {
    const state = get();
    const snapshot = projectData(state);
    const mutation = applyCompleteOnboarding(snapshot, displayName);
    const persisted = persistLocalOnly(withLiveHabitMembership(mutation.data));
    bumpCloudSavePayload(persisted);

    set((current) => ({
      ...current,
      ...persisted,
      rewardToasts: [
        ...current.rewardToasts,
        createToast(
          "unlock",
          "Welcome, traveler",
          `The path opens for ${mutation.settings.displayName}.`,
        ),
      ],
    }));

    if (!get().authUser) {
      return;
    }

    void completeOnboardingRequest(displayName).then((result) => {
      if (result.status !== "ok") {
        const rolledBack = persistLocalOnly(snapshot);
        bumpCloudSavePayload(rolledBack);
        set((current) => ({
          ...current,
          ...rolledBack,
          ...pushWarningState(
            { ...current, ...rolledBack } as HabitQuestStore,
            "Onboarding sync failed",
            result.status === "unauthenticated"
              ? "Sign in again to finish onboarding."
              : result.error,
          ),
        }));
        return;
      }
      set((current) => {
        const nextData = persistLocalOnly({
          ...projectData(current),
          settings: result.settings,
        });
        bumpCloudSavePayload(nextData);
        return { ...current, ...nextData };
      });
    });
  },
  dismissToast: (toastId) => {
    set((state) => ({
      rewardToasts: state.rewardToasts.filter((toast) => toast.id !== toastId),
    }));
  },
  dismissFloatingReward: (rewardId) => {
    set((state) => ({
      floatingRewards: state.floatingRewards.filter((reward) => reward.id !== rewardId),
    }));
  },
  dismissCelebration: () => {
    set({ celebration: null });
  },
  dismissSettlementRecap: () => {
    set((state) => {
      const throughDate = state.settlementRecap?.throughDate ?? null;
      if (throughDate) {
        markSettlementRecapSeen(throughDate);
      }
      return {
        settlementRecap: null,
        dismissedSettlementThroughDate: throughDate ?? state.dismissedSettlementThroughDate,
      };
    });
  },
}));
