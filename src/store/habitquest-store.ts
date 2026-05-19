"use client";

import { create } from "zustand";
import { DAILY_COMPLETION_COINS, DAILY_LOGIN_COINS } from "~/lib/habitquest/constants";
import { createSeedData } from "~/lib/habitquest/seed";
import { loadHabitQuestData, saveHabitQuestData } from "~/lib/habitquest/storage";
import {
  calculateChallengeProgress,
  checkDailyCompletion,
  checkLevelUnlocks,
  createExpEntry,
  createId,
  getDifficultyExp,
  getPendingAchievementRewards,
  getStreakBonus,
  getTodayDateKey,
  hasClaimedDailyReward,
  hasCompletionForDate,
  isFeatureUnlocked,
  normalizeFormValues,
  syncProgress,
  unlockAchievements,
} from "~/lib/habitquest/utils";
import type {
  FloatingReward,
  Habit,
  HabitFormValues,
  HabitQuestData,
  RewardToast,
} from "~/types/habitquest";

type HabitQuestStore = HabitQuestData & {
  hydrated: boolean;
  rewardToasts: RewardToast[];
  floatingRewards: FloatingReward[];
  hydrate: () => void;
  createHabit: (values: HabitFormValues) => void;
  updateHabit: (habitId: string, values: HabitFormValues) => void;
  deleteHabit: (habitId: string) => void;
  completeHabitForToday: (habitId: string) => void;
  claimChallengeReward: (challengeId: string) => void;
  purchaseShopItem: (itemId: string) => void;
  equipShopItem: (itemId: string) => void;
  dismissToast: (toastId: string) => void;
  dismissFloatingReward: (rewardId: string) => void;
};

const initialData = createSeedData();

type ResolutionOptions = {
  processDailyLogin?: boolean;
};

type ResolutionResult = {
  data: HabitQuestData;
  rewardToasts: RewardToast[];
  floatingRewards: FloatingReward[];
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
  return nextData;
}

function projectData(state: HabitQuestStore): HabitQuestData {
  return {
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
  };
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
  source: "achievement" | "challenge",
  label: string,
  rewardToasts: RewardToast[],
  floatingRewards: FloatingReward[],
) {
  const today = getTodayDateKey();
  data.userProgress = syncProgress(data.userProgress, data.completions, {
    totalCompletedHabits: data.completions.length,
    totalExp: data.userProgress.totalExp + amount,
    expHistory: [createExpEntry(amount, today, source, label), ...data.userProgress.expHistory],
  });
  rewardToasts.push(createToast("exp", "EXP earned", `${label} +${amount} EXP`));
  floatingRewards.push(createFloatingReward("exp", amount, label));
}

function normalizePersistentData(data: HabitQuestData) {
  return {
    ...data,
    userProgress: syncProgress(data.userProgress, data.completions, {
      totalCompletedHabits: data.completions.length,
    }),
  };
}

function resolveGameState(
  baseData: HabitQuestData,
  options: ResolutionOptions = {},
): ResolutionResult {
  const data = normalizePersistentData(baseData);
  const rewardToasts: RewardToast[] = [];
  const floatingRewards: FloatingReward[] = [];
  const today = getTodayDateKey();

  if (options.processDailyLogin && !hasClaimedDailyReward(data.dailyRewards, "login", today)) {
    appendCoins(data, DAILY_LOGIN_COINS, "Daily login reward", rewardToasts, floatingRewards);
    data.dailyRewards = {
      ...data.dailyRewards,
      lastLoginDate: today,
      claimedDailyLoginDate: today,
    };
  } else if (options.processDailyLogin && data.dailyRewards.lastLoginDate !== today) {
    data.dailyRewards = {
      ...data.dailyRewards,
      lastLoginDate: today,
    };
  }

  data.challenges = data.challenges.map((challenge) => calculateChallengeProgress(challenge, data));

  const dailyCompletion = checkDailyCompletion(data, today);
  if (
    dailyCompletion.qualifiesForReward &&
    !hasClaimedDailyReward(data.dailyRewards, "completion", today)
  ) {
    appendCoins(data, DAILY_COMPLETION_COINS, "Daily completion reward", rewardToasts, floatingRewards);
    data.dailyRewards = {
      ...data.dailyRewards,
      claimedDailyCompletionRewardDate: today,
    };
  }

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

    data.userProgress = syncProgress(data.userProgress, data.completions, {
      totalCompletedHabits: data.completions.length,
    });
    data.challenges = data.challenges.map((challenge) => calculateChallengeProgress(challenge, data));
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
  };
}

function mergeTransientState(
  state: HabitQuestStore,
  resolution: ResolutionResult,
) {
  return {
    ...resolution.data,
    rewardToasts: [...state.rewardToasts, ...resolution.rewardToasts],
    floatingRewards: [...state.floatingRewards, ...resolution.floatingRewards],
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

export const useHabitQuestStore = create<HabitQuestStore>((set, get) => ({
  ...initialData,
  hydrated: false,
  rewardToasts: [],
  floatingRewards: [],
  hydrate: () => {
    if (get().hydrated) {
      return;
    }

    const data = loadHabitQuestData();
    const resolution = resolveGameState(data, { processDailyLogin: true });
    const persisted = persistData(resolution.data);

    set({
      ...persisted,
      hydrated: true,
      rewardToasts: resolution.rewardToasts,
      floatingRewards: resolution.floatingRewards,
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
      customDays: values.recurrence === "custom" ? values.customDays : [],
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
                customDays: values.recurrence === "custom" ? values.customDays : [],
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
      const resolution = resolveGameState({
        ...projectData(state),
        habits: state.habits.filter((habit) => habit.id !== habitId),
      });
      const persisted = persistData(resolution.data);
      return mergeTransientState(state, { ...resolution, data: persisted });
    });
  },
  completeHabitForToday: (habitId) => {
    set((state) => {
      const today = getTodayDateKey();
      if (hasCompletionForDate(state.completions, habitId, today)) {
        return state;
      }

      const habit = state.habits.find((entry) => entry.id === habitId);
      if (!habit) {
        return state;
      }

      const baseExp = getDifficultyExp(habit.difficulty);
      const hadCompletionToday = state.completions.some((completion) => completion.date === today);
      const provisionalCompletion = {
        id: createId("completion"),
        habitId,
        date: today,
        expEarned: baseExp,
        streakBonusExp: 0,
        completedAt: new Date().toISOString(),
      };

      const provisionalProgress = syncProgress(
        state.userProgress,
        [provisionalCompletion, ...state.completions],
        {
          totalCompletedHabits: state.completions.length + 1,
          totalExp: state.userProgress.totalExp + baseExp,
          expHistory: [
            createExpEntry(baseExp, today, "habit", `${habit.title} completed`),
            ...state.userProgress.expHistory,
          ],
        },
      );

      const streakBonus = hadCompletionToday ? 0 : getStreakBonus(provisionalProgress.currentStreak);
      const completion = {
        ...provisionalCompletion,
        streakBonusExp: streakBonus,
      };

      const expEntries = streakBonus
        ? [
            createExpEntry(streakBonus, today, "streak", `${provisionalProgress.currentStreak}-day streak bonus`),
            createExpEntry(baseExp, today, "habit", `${habit.title} completed`),
            ...state.userProgress.expHistory,
          ]
        : [
            createExpEntry(baseExp, today, "habit", `${habit.title} completed`),
            ...state.userProgress.expHistory,
          ];

      const resolution = resolveGameState({
        ...projectData(state),
        completions: [completion, ...state.completions],
        userProgress: syncProgress(state.userProgress, [completion, ...state.completions], {
          totalCompletedHabits: state.completions.length + 1,
          totalExp: state.userProgress.totalExp + baseExp + streakBonus,
          expHistory: expEntries,
        }),
      });

      const persisted = persistData(resolution.data);
      return mergeTransientState(state, { ...resolution, data: persisted });
    });
  },
  claimChallengeReward: (challengeId) => {
    set((state) => {
      const challenge = state.challenges.find((entry) => entry.id === challengeId);
      if (!challenge || !challenge.completed || challenge.claimed) {
        return state;
      }

      let nextData: HabitQuestData = {
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

      if (challenge.reward.coins > 0) {
        appendCoins(nextData, challenge.reward.coins, challenge.title, rewardToasts, floatingRewards);
      }

      if (challenge.reward.exp > 0) {
        appendExp(nextData, challenge.reward.exp, "challenge", challenge.title, rewardToasts, floatingRewards);
      }

      if (challenge.reward.titleItemId) {
        nextData = {
          ...nextData,
          shopItems: nextData.shopItems.map((item) =>
            item.id === challenge.reward.titleItemId
              ? {
                  ...item,
                  owned: true,
                }
              : item,
          ),
        };
        rewardToasts.push(
          createToast("shop", "Exclusive title unlocked", "A challenge title has been added to your inventory."),
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

      const equippedItems =
        item.category === "title"
          ? { ...state.equippedItems, titleItemId: item.id }
          : item.category === "frame"
            ? { ...state.equippedItems, frameItemId: item.id }
            : { ...state.equippedItems, avatarItemId: item.id };

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
}));
