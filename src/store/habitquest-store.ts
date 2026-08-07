"use client";

import { create } from "zustand";
import type { AuthUser } from "~/lib/auth/session-types";
import { completeHabitAction, uncompleteHabitAction } from "~/app/actions/habits";
import {
  bumpCloudSavePayload,
  flushCloudSaveNow,
  scheduleCloudSave,
} from "~/lib/habitquest/cloud-sync";
import {
  BOSS_CLEAR_COINS,
  BOSS_CLEAR_EXP,
  DAILY_LOGIN_COINS,
  MAX_STREAK_FREEZES,
  STREAK_FREEZE_COST,
  setLocalPersistenceEnabled,
} from "~/lib/habitquest/constants";
import {
  applyCompleteHabitForToday,
  applyUncompleteHabitForToday,
} from "~/lib/habitquest/habit-mutations";
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
  isFeatureUnlocked,
  normalizeFormValues,
  reconcileChallenges,
  removeCompletionsFromProgress,
  syncProgress,
  unlockAchievements,
} from "~/lib/habitquest/utils";
import type {
  CelebrationEvent,
  Challenge,
  ExpHistoryEntry,
  FloatingReward,
  Habit,
  HabitFormValues,
  HabitQuestData,
  RewardToast,
  SettlementRecap,
  ShopCategory,
  UserSettings,
} from "~/types/habitquest";

type HabitQuestStore = HabitQuestData & {
  hydrated: boolean;
  authChecked: boolean;
  authUser: AuthUser | null;
  pendingHabitIds: string[];
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

function spendCoins(
  data: HabitQuestData,
  amount: number,
) {
  data.wallet = {
    ...data.wallet,
    totalCoins: data.wallet.totalCoins - amount,
    lifetimeCoinsSpent: data.wallet.lifetimeCoinsSpent + amount,
  };
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
      ...state.rewardToasts,
      createToast("warning", title, description),
    ],
  };
}

function equippedPatchForCategory(
  equippedItems: HabitQuestData["equippedItems"],
  category: ShopCategory,
  itemId: string | null,
) {
  if (category === "title") {
    return { ...equippedItems, titleItemId: itemId };
  }
  if (category === "frame") {
    return { ...equippedItems, frameItemId: itemId };
  }
  if (category === "avatar") {
    return { ...equippedItems, avatarItemId: itemId };
  }
  return { ...equippedItems, themeItemId: itemId };
}

const habitMutationSeq = new Map<string, number>();

function nextHabitMutationSeq(habitId: string) {
  const next = (habitMutationSeq.get(habitId) ?? 0) + 1;
  habitMutationSeq.set(habitId, next);
  return next;
}

function isCurrentHabitMutation(habitId: string, seq: number) {
  return habitMutationSeq.get(habitId) === seq;
}

export const useHabitQuestStore = create<HabitQuestStore>((set, get) => ({
  ...initialData,
  hydrated: false,
  authChecked: false,
  authUser: null,
  pendingHabitIds: [],
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
    const values = normalizeFormValues(rawValues);
    if (!values.title) {
      return;
    }

    const now = new Date().toISOString();
    const habit: Habit = {
      id: createId("habit"),
      title: values.title,
      description: values.description,
      difficulty: values.difficulty,
      recurrence: values.recurrence,
      customDays:
        values.recurrence === "custom" || values.recurrence === "weekly"
          ? values.customDays
          : [],
      createdAt: now,
      updatedAt: now,
    };

    set((state) => {
      const resolution = resolveGameState({
        ...projectData(state),
        habits: [habit, ...state.habits],
      });
      const persisted = persistData(resolution.data);
      return mergeTransientState(state, { ...resolution, data: persisted });
    });
  },
  updateHabit: (habitId, rawValues) => {
    const values = normalizeFormValues(rawValues);
    if (!values.title) {
      return;
    }

    set((state) => {
      const resolution = resolveGameState({
        ...projectData(state),
        habits: state.habits.map((habit) =>
          habit.id === habitId
            ? {
                ...habit,
                title: values.title,
                description: values.description,
                difficulty: values.difficulty,
                recurrence: values.recurrence,
                customDays:
                  values.recurrence === "custom" || values.recurrence === "weekly"
                    ? values.customDays
                    : [],
                updatedAt: new Date().toISOString(),
              }
            : habit,
        ),
      });
      const persisted = persistData(resolution.data);
      return mergeTransientState(state, { ...resolution, data: persisted });
    });
  },
  deleteHabit: (habitId) => {
    set((state) => {
      const habit = state.habits.find((entry) => entry.id === habitId);
      const removedCompletions = state.completions.filter(
        (completion) => completion.habitId === habitId,
      );
      const titleMap = new Map(
        state.habits.map((entry) => [entry.id, entry.title] as const),
      );
      const settledThrough = state.rewardSystems.progressSettledThroughDate;
      const settledRemovals = removedCompletions.filter((completion) =>
        settledThrough ? completion.date <= settledThrough : completion.date < getTodayDateKey(),
      );
      const remainingCompletions = state.completions.filter(
        (completion) => completion.habitId !== habitId,
      );

      let nextData: HabitQuestData = {
        ...projectData(state),
        habits: state.habits.filter((entry) => entry.id !== habitId),
        completions: remainingCompletions,
      };

      // Only claw settled EXP — today's pending clears never entered totalExp.
      if (settledRemovals.length) {
        nextData = removeCompletionsFromProgress(
          {
            ...nextData,
            completions: [...remainingCompletions, ...settledRemovals],
          },
          settledRemovals,
          titleMap,
        );
        nextData = {
          ...nextData,
          completions: remainingCompletions,
        };
      }

      if (habit) {
        titleMap.delete(habit.id);
      }

      const resolution = resolveGameState(nextData);
      const persisted = persistData(resolution.data);
      return mergeTransientState(state, { ...resolution, data: persisted });
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
    const resolution = resolveGameState(mutation.data);
    const persisted = persistLocalOnly(resolution.data);
    bumpCloudSavePayload(persisted);

    set((current) => ({
      ...mergeTransientState(current, { ...resolution, data: persisted }),
      pendingHabitIds: [...current.pendingHabitIds, habitId],
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

    void completeHabitAction(habitId, today)
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
            pendingHabitIds: current.pendingHabitIds.filter((id) => id !== habitId),
            ...pushWarningState(
              { ...current, ...rolledBack } as HabitQuestStore,
              "Sync failed",
              result.status === "unauthenticated"
                ? "Sign in again to save habit clears."
                : result.error,
            ),
          }));
          return;
        }

        set((current) => {
          const completions = result.completion
            ? [
                result.completion,
                ...current.completions.filter(
                  (entry) =>
                    !(entry.habitId === result.habitId && entry.date === result.date),
                ),
              ]
            : current.completions.filter(
                (entry) =>
                  !(entry.habitId === result.habitId && entry.date === result.date),
              );

          const rewardSystems = reconcileTodayCombo(
            {
              ...current.rewardSystems,
              todayCombo: result.rewardSystems.todayCombo,
              comboDate: result.rewardSystems.comboDate,
            },
            completions,
            result.date,
          );

          const nextData = persistLocalOnly({
            ...projectData(current),
            completions,
            rewardSystems,
          });
          bumpCloudSavePayload(nextData);

          return {
            ...current,
            ...nextData,
            pendingHabitIds: current.pendingHabitIds.filter((id) => id !== habitId),
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
          pendingHabitIds: current.pendingHabitIds.filter((id) => id !== habitId),
          ...pushWarningState(
            { ...current, ...rolledBack } as HabitQuestStore,
            "Sync failed",
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
    const resolution = resolveGameState(mutation.data);
    const persisted = persistLocalOnly(resolution.data);
    bumpCloudSavePayload(persisted);

    set((current) => ({
      ...mergeTransientState(current, { ...resolution, data: persisted }),
      pendingHabitIds: [...current.pendingHabitIds, habitId],
      rewardToasts: [
        ...current.rewardToasts,
        ...mutation.rewardToasts,
        ...resolution.rewardToasts,
      ],
    }));

    void uncompleteHabitAction(habitId, today)
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
            pendingHabitIds: current.pendingHabitIds.filter((id) => id !== habitId),
            ...pushWarningState(
              { ...current, ...rolledBack } as HabitQuestStore,
              "Sync failed",
              result.status === "unauthenticated"
                ? "Sign in again to sync habit undos."
                : result.error,
            ),
          }));
          return;
        }

        set((current) => {
          const completions = current.completions.filter(
            (entry) => !(entry.habitId === result.habitId && entry.date === result.date),
          );
          const rewardSystems = reconcileTodayCombo(
            {
              ...current.rewardSystems,
              todayCombo: result.rewardSystems.todayCombo,
              comboDate: result.rewardSystems.comboDate,
            },
            completions,
            result.date,
          );
          const nextData = persistLocalOnly({
            ...projectData(current),
            completions,
            rewardSystems,
          });
          bumpCloudSavePayload(nextData);

          return {
            ...current,
            ...nextData,
            pendingHabitIds: current.pendingHabitIds.filter((id) => id !== habitId),
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
          pendingHabitIds: current.pendingHabitIds.filter((id) => id !== habitId),
          ...pushWarningState(
            { ...current, ...rolledBack } as HabitQuestStore,
            "Sync failed",
            error instanceof Error ? error.message : "Network error while undoing clear.",
          ),
        }));
      });
  },
  claimChallengeReward: (challengeId) => {
    set((state) => {
      const challenge = state.challenges.find((entry) => entry.id === challengeId);
      if (!challenge || !challenge.completed || challenge.claimed) {
        return state;
      }

      const nextData: HabitQuestData = {
        ...projectData(state),
        challenges: state.challenges.map((entry) =>
          entry.id === challengeId
            ? {
                ...entry,
                claimed: true,
              }
            : entry,
        ),
      };

      const rewardToasts: RewardToast[] = [];
      const floatingRewards: FloatingReward[] = [];
      applyChallengeReward(nextData, challenge, rewardToasts, floatingRewards);

      const resolution = resolveGameState(nextData);
      const persisted = persistData(resolution.data);

      return {
        ...mergeTransientState(state, { ...resolution, data: persisted }),
        rewardToasts: [
          ...state.rewardToasts,
          ...rewardToasts,
          ...resolution.rewardToasts,
        ],
        floatingRewards: [
          ...state.floatingRewards,
          ...floatingRewards,
          ...resolution.floatingRewards,
        ],
      };
    });
  },
  claimQuestArcReward: (arcId) => {
    set((state) => {
      if (!isFeatureUnlocked(state.levelUnlocks, "quest-arcs")) {
        return {
          ...state,
          ...pushWarningState(state, "Feature locked", "Quest arcs unlock at level 3."),
        };
      }

      const arc = state.questArcs.find((entry) => entry.id === arcId);
      if (!arc || !arc.completed || arc.claimed) {
        return state;
      }

      const nextData: HabitQuestData = {
        ...projectData(state),
        questArcs: state.questArcs.map((entry) =>
          entry.id === arcId ? { ...entry, claimed: true } : entry,
        ),
      };

      const rewardToasts: RewardToast[] = [];
      const floatingRewards: FloatingReward[] = [];

      if (arc.reward.coins > 0) {
        appendCoins(nextData, arc.reward.coins, arc.title, rewardToasts, floatingRewards);
      }
      if (arc.reward.exp > 0) {
        appendExp(nextData, arc.reward.exp, "quest", arc.title, rewardToasts, floatingRewards);
      }
      if (arc.reward.unlockThemeId) {
        nextData.shopItems = nextData.shopItems.map((item) =>
          item.id === arc.reward.unlockThemeId ? { ...item, owned: true } : item,
        );
        rewardToasts.push(
          createToast("shop", "Theme unlocked", "A quest theme was added to your inventory."),
        );
      }

      const resolution = resolveGameState(nextData);
      const persisted = persistData(resolution.data);

      return {
        ...mergeTransientState(state, { ...resolution, data: persisted }),
        rewardToasts: [
          ...state.rewardToasts,
          ...rewardToasts,
          ...resolution.rewardToasts,
        ],
        floatingRewards: [
          ...state.floatingRewards,
          ...floatingRewards,
          ...resolution.floatingRewards,
        ],
        celebration: createCelebration(
          "quest-chapter",
          arc.title,
          "Chapter complete — rewards claimed.",
        ),
      };
    });
  },
  claimSeasonPassLevel: (level) => {
    set((state) => {
      if (!isFeatureUnlocked(state.levelUnlocks, "season-pass")) {
        return {
          ...state,
          ...pushWarningState(state, "Feature locked", "Season Pass unlocks at level 4."),
        };
      }

      const reward = state.seasonPass.rewards.find((entry) => entry.level === level);
      if (!reward || state.seasonPass.level < level || state.seasonPass.claimedLevels.includes(level)) {
        return state;
      }

      const nextData: HabitQuestData = {
        ...projectData(state),
        seasonPass: {
          ...state.seasonPass,
          claimedLevels: [...state.seasonPass.claimedLevels, level],
        },
      };

      const rewardToasts: RewardToast[] = [];
      const floatingRewards: FloatingReward[] = [];
      if (reward.coins > 0) {
        appendCoins(nextData, reward.coins, reward.label, rewardToasts, floatingRewards);
      }
      if (reward.exp > 0) {
        appendExp(nextData, reward.exp, "season", reward.label, rewardToasts, floatingRewards);
      }

      const resolution = resolveGameState(nextData);
      const persisted = persistData(resolution.data);

      return {
        ...mergeTransientState(state, { ...resolution, data: persisted }),
        rewardToasts: [
          ...state.rewardToasts,
          ...rewardToasts,
          ...resolution.rewardToasts,
        ],
        floatingRewards: [
          ...state.floatingRewards,
          ...floatingRewards,
          ...resolution.floatingRewards,
        ],
        celebration: createCelebration(
          "season-level",
          `Season reward · Lv ${level}`,
          reward.label,
        ),
      };
    });
  },
  claimBossReward: () => {
    set((state) => {
      if (!state.weeklyBoss.defeated || state.weeklyBoss.rewardClaimed) {
        return state;
      }

      const nextData: HabitQuestData = {
        ...projectData(state),
        weeklyBoss: {
          ...state.weeklyBoss,
          rewardClaimed: true,
        },
      };

      const rewardToasts: RewardToast[] = [];
      const floatingRewards: FloatingReward[] = [];
      appendCoins(nextData, BOSS_CLEAR_COINS, `${state.weeklyBoss.name} clear`, rewardToasts, floatingRewards);
      appendExp(nextData, BOSS_CLEAR_EXP, "boss", `${state.weeklyBoss.name} clear`, rewardToasts, floatingRewards);

      const resolution = resolveGameState(nextData);
      const persisted = persistData(resolution.data);

      return {
        ...mergeTransientState(state, { ...resolution, data: persisted }),
        rewardToasts: [
          ...state.rewardToasts,
          ...rewardToasts,
          ...resolution.rewardToasts,
        ],
        floatingRewards: [
          ...state.floatingRewards,
          ...floatingRewards,
          ...resolution.floatingRewards,
        ],
        celebration: createCelebration(
          "boss-clear",
          "Boss reward claimed",
          `${state.weeklyBoss.name} bounty secured.`,
        ),
      };
    });
  },
  buyStreakFreeze: () => {
    set((state) => {
      if (state.rewardSystems.streakFreezes >= MAX_STREAK_FREEZES) {
        return {
          ...state,
          ...pushWarningState(state, "Freeze cap reached", `You already hold ${MAX_STREAK_FREEZES} freezes.`),
        };
      }

      if (state.wallet.totalCoins < STREAK_FREEZE_COST) {
        return {
          ...state,
          ...pushWarningState(
            state,
            "Not enough coins",
            `A streak freeze costs ${STREAK_FREEZE_COST} coins.`,
          ),
        };
      }

      const nextData: HabitQuestData = {
        ...projectData(state),
        rewardSystems: {
          ...state.rewardSystems,
          streakFreezes: state.rewardSystems.streakFreezes + 1,
        },
      };
      spendCoins(nextData, STREAK_FREEZE_COST);

      const resolution = resolveGameState(nextData);
      const persisted = persistData(resolution.data);
      void flushCloudSaveNow(persisted);

      return {
        ...mergeTransientState(state, { ...resolution, data: persisted }),
        rewardToasts: [
          ...state.rewardToasts,
          createToast("shop", "Streak freeze bought", `Spent ${STREAK_FREEZE_COST} coins.`),
          ...resolution.rewardToasts,
        ],
      };
    });
  },
  purchaseShopItem: (itemId) => {
    set((state) => {
      const item = state.shopItems.find((entry) => entry.id === itemId);
      if (!item) {
        return state;
      }

      if (item.owned) {
        return {
          ...state,
          ...pushWarningState(state, "Already owned", `${item.name} is already in your inventory.`),
        };
      }

      if (item.exclusive) {
        return {
          ...state,
          ...pushWarningState(state, "Exclusive item", `${item.name} can only be earned through gameplay rewards.`),
        };
      }

      if (item.requiredFeature && !isFeatureUnlocked(state.levelUnlocks, item.requiredFeature)) {
        return {
          ...state,
          ...pushWarningState(state, "Feature locked", `${item.name} requires ${item.requiredLevel}.`),
        };
      }

      if (state.userProgress.level < item.requiredLevel) {
        return {
          ...state,
          ...pushWarningState(state, "Level too low", `${item.name} unlocks at level ${item.requiredLevel}.`),
        };
      }

      if (state.wallet.totalCoins < item.price) {
        return {
          ...state,
          ...pushWarningState(state, "Not enough coins", `You need ${item.price - state.wallet.totalCoins} more coins for ${item.name}.`),
        };
      }

      const nextData: HabitQuestData = {
        ...projectData(state),
        shopItems: state.shopItems.map((entry) =>
          entry.id === itemId
            ? {
                ...entry,
                owned: true,
              }
            : entry,
        ),
      };

      spendCoins(nextData, item.price);
      const resolution = resolveGameState(nextData);
      const persisted = persistData(resolution.data);
      void flushCloudSaveNow(persisted);

      return {
        ...mergeTransientState(state, { ...resolution, data: persisted }),
        rewardToasts: [
          ...state.rewardToasts,
          createToast("shop", "Purchase successful", `${item.name} added to inventory.`),
          ...resolution.rewardToasts,
        ],
      };
    });
  },
  equipShopItem: (itemId) => {
    set((state) => {
      const item = state.shopItems.find((entry) => entry.id === itemId);
      if (!item || !item.owned) {
        return state;
      }

      if (item.requiredFeature && !isFeatureUnlocked(state.levelUnlocks, item.requiredFeature)) {
        return {
          ...state,
          ...pushWarningState(state, "Feature locked", `${item.name} is still locked.`),
        };
      }

      const equippedItems = equippedPatchForCategory(state.equippedItems, item.category, item.id);

      const persisted = persistData({
        ...projectData(state),
        equippedItems,
      });

      return {
        ...state,
        ...persisted,
        rewardToasts: [
          ...state.rewardToasts,
          createToast("shop", "Equipped", `${item.name} is now active.`),
        ],
      };
    });
  },
  unequipShopItem: (category) => {
    set((state) => {
      const equippedItems = equippedPatchForCategory(state.equippedItems, category, null);

      const persisted = persistData({
        ...projectData(state),
        equippedItems,
      });

      return {
        ...state,
        ...persisted,
        rewardToasts: [
          ...state.rewardToasts,
          createToast("shop", "Unequipped", `${category} slot cleared.`),
        ],
      };
    });
  },
  updateSettings: (patch) => {
    set((state) => {
      const settings: UserSettings = {
        ...state.settings,
        ...patch,
        displayName:
          patch.displayName !== undefined
            ? patch.displayName.trim().slice(0, 32)
            : state.settings.displayName,
      };

      const persisted = persistData({
        ...projectData(state),
        settings,
      });

      return {
        ...state,
        ...persisted,
      };
    });
  },
  completeOnboarding: (displayName) => {
    set((state) => {
      const settings: UserSettings = {
        ...state.settings,
        displayName: displayName.trim().slice(0, 32) || "Adventurer",
        onboardingCompleted: true,
      };

      const persisted = persistData({
        ...projectData(state),
        settings,
      });

      return {
        ...state,
        ...persisted,
        rewardToasts: [
          ...state.rewardToasts,
          createToast("unlock", "Welcome aboard", `Quest log ready for ${settings.displayName}.`),
        ],
      };
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
