import { getBuiltinCatalog } from "~/lib/habitquest/catalog";
import { DEFAULT_SETTINGS, SAVE_VERSION } from "~/lib/habitquest/constants";
import {
  createDefaultRewardSystems,
  createSeasonPass,
  createWeeklyBoss,
} from "~/lib/habitquest/rewards";
import { createId } from "~/lib/habitquest/utils";
import type { HabitQuestData } from "~/types/habitquest";

export function createSeedData(): HabitQuestData {
  const now = new Date().toISOString();
  const catalog = getBuiltinCatalog();
  const season = createSeasonPass();

  return {
    version: SAVE_VERSION,
    habits: [
      {
        id: createId("habit"),
        title: "Morning stretch",
        description: "A five-minute mobility reset before opening anything else.",
        difficulty: "easy",
        recurrence: "daily",
        customDays: [],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: createId("habit"),
        title: "Deep work sprint",
        description: "One focused 45-minute block on your most important task.",
        difficulty: "hard",
        recurrence: "daily",
        customDays: [],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: createId("habit"),
        title: "Strength training",
        description: "Short session to keep the body in the game.",
        difficulty: "medium",
        recurrence: "custom",
        customDays: [1, 3, 5],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: createId("habit"),
        title: "Journal recap",
        description: "Close the day with a short review and one improvement note.",
        difficulty: "easy",
        recurrence: "daily",
        customDays: [],
        createdAt: now,
        updatedAt: now,
      },
    ],
    completions: [],
    achievements: catalog.achievements,
    challenges: catalog.challenges,
    shopItems: catalog.shopItems,
    equippedItems: {
      titleItemId: null,
      frameItemId: null,
      avatarItemId: null,
      themeItemId: null,
    },
    wallet: {
      totalCoins: 0,
      lifetimeCoinsEarned: 0,
      lifetimeCoinsSpent: 0,
    },
    dailyRewards: {
      lastLoginDate: null,
      claimedDailyLoginDate: null,
      claimedDailyCompletionRewardDate: null,
    },
    levelUnlocks: catalog.levelUnlocks,
    userProgress: {
      totalExp: 0,
      level: 1,
      currentStreak: 0,
      bestStreak: 0,
      totalCompletedHabits: 0,
      lastCompletedDate: null,
      expHistory: [],
    },
    settings: {
      ...DEFAULT_SETTINGS,
    },
    rewardSystems: createDefaultRewardSystems(),
    questArcs: catalog.questArcs,
    seasonPass: {
      ...season,
      rewards: catalog.seasonRewards,
    },
    weeklyBoss: createWeeklyBoss(),
  };
}
