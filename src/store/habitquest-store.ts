"use client";

import { create } from "zustand";
import type { AuthUser } from "~/lib/auth/session-types";
import {
  claimBossRewardAction,
  claimChallengeRewardAction,
  claimQuestArcRewardAction,
  claimSeasonPassLevelAction,
  buyStreakFreezeAction,
  completeOnboardingAction,
  updateSettingsAction,
} from "~/app/actions/claims";
import {
  createHabitAction,
  deleteHabitAction,
  updateHabitAction,
} from "~/app/actions/habit-crud";
import { completeHabitAction, uncompleteHabitAction } from "~/app/actions/habits";
import {
  equipShopItemAction,
  purchaseShopItemAction,
  unequipShopItemAction,
} from "~/app/actions/shop";
import {
  bumpCloudSavePayload,
  ensureCloudSavePushed,
  flushCloudSaveNow,
  scheduleCloudSave,
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
} from "~/lib/habitquest/habit-mutations";
import {
  applyBuyStreakFreeze,
  applyClaimBossReward,
  applyClaimChallengeReward,
  applyClaimQuestArcReward,
  applyClaimSeasonPassLevel,
  applyCompleteOnboarding,
  applyUpdateSettings,
} from "~/lib/habitquest/reward-claim-mutations";
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
  getActiveShieldDates,
  maybeGrantStreakFreeze,
  reconcileSeasonPass,
  reconcileStreakShields,
  reconcileWeeklyBoss,
  reconcileTodayCombo,
  syncQuestArcs,
} from "~/lib/habitquest/rewards";
import { settleHabitDayProgress } from "~/lib/habitquest/day-settlement";
import { createSeedData } from "~/lib/habitquest/seed";
import {
  loadHabitQuestData,
  saveHabitQuestData,
} from "~/lib/habitquest/storage";
import {
  checkLevelUnlocks,
  createExpEntry,
  createId,
  getPendingAchievementRewards,
  getTodayDateKey,
  hasClaimedDailyReward,
  reconcileChallenges,
  syncProgress,
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
  const through = data.rewardSystems.progressSettledThroughDate;
  const settledCompletions = through
    ? data.completions.filter((completion) => completion.date <= through)
    : data.completions.filter((completion) => completion.date < getTodayDateKey());

  return syncProgress(
    data.userProgress,
    settledCompletions,
    {
      totalCompletedHabits: settledCompletions.length,
      totalExp: data.userProgress.totalExp,
      expHistory: data.userProgress.expHistory,
      ...extra,
    },
    getActiveShieldDates(data.rewardSystems),
  );
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
    data.shopItems = data.shopItems.map((item) =>
      item.id === challenge.reward.titleItemId
        ? {
            ...item,
            owned: true,
          }
        : item,
    );
    rewardToasts.push(
      createToast(
        "shop",
        options.autoClaimed ? "Challenge title auto-claimed" : "Exclusive title unlocked",
        "A challenge title has been added to your inventory.",
      ),
    );
  }
}

function ensureRewardFields(data: HabitQuestData): HabitQuestData {
  return {
    ...data,
    rewardSystems: data.rewardSystems ?? createDefaultRewardSystems(),
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
  const rewardSystems = reconcileTodayCombo(
    withRewards.rewardSystems,
    withRewards.completions,
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
  pendingKey: string,
  seqKey: string,
  seq: number,
  error: string,
) {
  if (!isCurrentShopMutation(seqKey, seq)) {
    return;
  }
  const rolledBack = persistLocalOnly(snapshot);
  bumpCloudSavePayload(rolledBack);
  useHabitQuestStore.setState((current) => ({
    ...current,
    ...rolledBack,
    pendingClaimIds: current.pendingClaimIds.filter((id) => id !== pendingKey),
    ...pushWarningState(
      { ...current, ...rolledBack } as HabitQuestStore,
      "Claim failed",
      error,
    ),
  }));
}

async function runClaimAgainstCloud(
  snapshot: HabitQuestData,
  pendingKey: string,
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
  // Prefer surgical claim first. Full-save push is only a bootstrap for empty accounts —
  // pushing every claim can fail on Vercel when client local "yesterday" is still UTC "today".
  let result = await claim();
  if (
    result.status === "error" &&
    /no cloud save/i.test(result.error)
  ) {
    const ensured = await ensureCloudSavePushed(snapshot);
    if (!ensured.ok) {
      rollbackClaimFailure(snapshot, pendingKey, seqKey, seq, ensured.error);
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
      pendingKey,
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
    } else {
      setLocalPersistenceEnabled(true);
    }
    set({ authUser: user });
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
    const resolution = resolveGameState(data, {
      processDailyLogin: options.processDailyLogin ?? false,
    });
    // Keep a durable browser cache so purchases survive refresh races.
    saveHabitQuestData(resolution.data);

    const claimedAfter = resolution.data.dailyRewards.claimedDailyLoginDate;
    const loginJustClaimed =
      Boolean(claimedAfter) && claimedAfter !== claimedBefore;

    // Daily login must hit the cloud immediately — a debounced push is what
    // made refresh re-grant +1 coin every time.
    if (loginJustClaimed) {
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

    void createHabitAction(rawValues, habitId)
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

    void updateHabitAction(habitId, rawValues)
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
    set((current) => ({
      ...current,
      ...withHabitPending(current, habitId, "delete"),
    }));

    void deleteHabitAction(habitId)
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
    set((current) => ({
      ...current,
      ...withHabitPending(current, habitId, "complete"),
    }));

    void completeHabitAction(habitId, today)
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
              "Complete failed",
              result.status === "unauthenticated"
                ? "Sign in again to save habit clears."
                : result.error,
            ),
          }));
          return;
        }

        const completions = result.completion
          ? [
              result.completion,
              ...mutation.data.completions.filter(
                (entry) =>
                  !(entry.habitId === result.habitId && entry.date === result.date),
              ),
            ]
          : mutation.data.completions.filter(
              (entry) =>
                !(entry.habitId === result.habitId && entry.date === result.date),
            );

        const withServerCompletion = withLiveHabitMembership({
          ...mutation.data,
          completions,
          rewardSystems: reconcileTodayCombo(
            {
              ...mutation.data.rewardSystems,
              todayCombo: result.rewardSystems.todayCombo,
              comboDate: result.rewardSystems.comboDate,
            },
            completions,
            result.date,
          ),
        });

        const resolution = resolveGameState(withServerCompletion);
        const persisted = persistLocalOnly(resolution.data);
        bumpCloudSavePayload(persisted);

        set((current) => ({
          ...mergeTransientState(current, { ...resolution, data: persisted }),
          ...withoutHabitPending(current, habitId),
          rewardToasts: [
            ...current.rewardToasts,
            ...mutation.rewardToasts,
            ...resolution.rewardToasts,
          ],
          floatingRewards: [
            ...current.floatingRewards,
            ...resolution.floatingRewards,
          ],
          celebration: mutation.celebration ?? resolution.celebration,
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
            "Complete failed",
            error instanceof Error ? error.message : "Network error while saving clear.",
          ),
        }));
      });
  },
  uncompleteHabitForToday: (habitId) => {
    const state = get();
    if (state.pendingHabitIds.includes(habitId)) {
      return;
    }

    const today = getTodayDateKey();
    const snapshot = projectData(state);
    const mutation = applyUncompleteHabitForToday(snapshot, habitId, today);
    if (!mutation.ok) {
      return;
    }

    const seq = nextHabitMutationSeq(habitId);
    set((current) => ({
      ...current,
      ...withHabitPending(current, habitId, "uncomplete"),
    }));

    void uncompleteHabitAction(habitId, today)
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
              "Undo failed",
              result.status === "unauthenticated"
                ? "Sign in again to sync habit undos."
                : result.error,
            ),
          }));
          return;
        }

        const withServerCombo = withLiveHabitMembership({
          ...mutation.data,
          rewardSystems: reconcileTodayCombo(
            {
              ...mutation.data.rewardSystems,
              todayCombo: result.rewardSystems.todayCombo,
              comboDate: result.rewardSystems.comboDate,
            },
            mutation.data.completions,
            result.date,
          ),
        });
        const resolution = resolveGameState(withServerCombo);
        const persisted = persistLocalOnly(resolution.data);
        bumpCloudSavePayload(persisted);

        set((current) => ({
          ...mergeTransientState(current, { ...resolution, data: persisted }),
          ...withoutHabitPending(current, habitId),
          rewardToasts: [
            ...current.rewardToasts,
            ...mutation.rewardToasts,
            ...resolution.rewardToasts,
          ],
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
      () => claimChallengeRewardAction(challengeId),
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
      () => claimQuestArcRewardAction(arcId),
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
      () => claimSeasonPassLevelAction(level),
      (result) => {
        set((current) => {
          const nextData = persistLocalOnly({
            ...projectData(current),
            wallet: result.wallet,
            userProgress: result.userProgress,
            seasonPass: result.seasonPass ?? current.seasonPass,
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
      () => claimBossRewardAction(),
      (result) => {
        set((current) => {
          const nextData = persistLocalOnly({
            ...projectData(current),
            wallet: result.wallet,
            userProgress: result.userProgress,
            weeklyBoss: result.weeklyBoss ?? current.weeklyBoss,
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
    set((current) => ({
      ...current,
      pendingClaimIds: [...current.pendingClaimIds, pendingKey],
    }));

    void runClaimAgainstCloud(
      snapshot,
      pendingKey,
      seqKey,
      seq,
      () => buyStreakFreezeAction(),
      (result) => {
        const resolution = resolveGameState(
          withLiveHabitMembership({
            ...mutation.data,
            wallet: result.wallet,
            rewardSystems: result.rewardSystems ?? mutation.data.rewardSystems,
          }),
        );
        const persisted = persistLocalOnly(resolution.data);
        bumpCloudSavePayload(persisted);
        set((current) => ({
          ...mergeTransientState(current, { ...resolution, data: persisted }),
          pendingClaimIds: current.pendingClaimIds.filter((id) => id !== pendingKey),
          rewardToasts: [
            ...current.rewardToasts,
            ...mutation.rewardToasts,
            ...resolution.rewardToasts,
          ],
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
    const seq = nextShopMutationSeq(itemId);
    set((current) => ({
      ...current,
      pendingShopItemIds: [...current.pendingShopItemIds, itemId],
    }));

    void purchaseShopItemAction(itemId)
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
    const seq = nextShopMutationSeq(itemId);
    set((current) => ({
      ...current,
      pendingShopItemIds: [...current.pendingShopItemIds, itemId],
    }));

    void equipShopItemAction(itemId)
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
    set((current) => ({
      ...current,
      pendingShopItemIds: [...current.pendingShopItemIds, pendingKey],
    }));

    void unequipShopItemAction(category)
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

    void updateSettingsAction(patch).then((result) => {
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

    void completeOnboardingAction(displayName).then((result) => {
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
