import { DEFAULT_COSMETIC_IDS, ensureStarterCosmetics, getBuiltinCatalog } from "./catalog";
import { DEFAULT_SETTINGS, SAVE_VERSION } from "./constants";
import {
  createDefaultRewardSystems,
  createSeasonPass,
} from "./rewards";
import { createId } from "./utils";
import { getStarterHabitBlueprints } from "./starter-habits";
import type { HabitQuestData } from "./types";

export function createSeedData(): HabitQuestData {
  const now = new Date().toISOString();
  const catalog = getBuiltinCatalog();
  const season = createSeasonPass();

  return ensureStarterCosmetics({
    version: SAVE_VERSION,
    habits: getStarterHabitBlueprints().map((blueprint) => ({
      ...blueprint.fields,
      id: createId("habit"),
      createdAt: now,
      updatedAt: now,
    })),
    completions: [],
    achievements: catalog.achievements,
    challenges: catalog.challenges,
    shopItems: catalog.shopItems,
    equippedItems: {
      titleItemId: DEFAULT_COSMETIC_IDS.title,
      frameItemId: DEFAULT_COSMETIC_IDS.frame,
      avatarItemId: DEFAULT_COSMETIC_IDS.avatar,
      themeItemId: DEFAULT_COSMETIC_IDS.theme,
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
  });
}
