import { STORAGE_KEY } from "~/lib/habitquest/constants";
import { createSeedData } from "~/lib/habitquest/seed";
import type {
  Achievement,
  Challenge,
  HabitQuestData,
  LevelUnlock,
  ShopItem,
} from "~/types/habitquest";

function isBrowser() {
  return typeof window !== "undefined";
}

function mergeAchievements(
  saved: HabitQuestData["achievements"] | undefined,
  fallback: HabitQuestData["achievements"],
): Achievement[] {
  if (!saved?.length) {
    return fallback;
  }

  const savedByKey = new Map(saved.map((achievement) => [achievement.key, achievement]));

  return fallback.map((seedAchievement) => {
    const existing = savedByKey.get(seedAchievement.key);
    if (!existing) {
      return seedAchievement;
    }

    return {
      ...seedAchievement,
      ...existing,
      reward: {
        ...seedAchievement.reward,
        ...(existing.reward ?? {}),
      },
    };
  });
}

function mergeChallenges(
  saved: HabitQuestData["challenges"] | undefined,
  fallback: HabitQuestData["challenges"],
): Challenge[] {
  if (!saved?.length) {
    return fallback;
  }

  const savedByKey = new Map(saved.map((challenge) => [challenge.key, challenge]));

  return fallback.map((seedChallenge) => {
    const existing = savedByKey.get(seedChallenge.key);
    if (!existing) {
      return seedChallenge;
    }

    return {
      ...seedChallenge,
      ...existing,
      reward: {
        ...seedChallenge.reward,
        ...(existing.reward ?? {}),
      },
    };
  });
}

function mergeShopItems(
  saved: HabitQuestData["shopItems"] | undefined,
  fallback: HabitQuestData["shopItems"],
): ShopItem[] {
  if (!saved?.length) {
    return fallback;
  }

  const savedById = new Map(saved.map((item) => [item.id, item]));

  return fallback.map((seedItem) => {
    const existing = savedById.get(seedItem.id);
    if (!existing) {
      return seedItem;
    }

    return {
      ...seedItem,
      ...existing,
    };
  });
}

function mergeLevelUnlocks(
  saved: HabitQuestData["levelUnlocks"] | undefined,
  fallback: HabitQuestData["levelUnlocks"],
): LevelUnlock[] {
  if (!saved?.length) {
    return fallback;
  }

  const savedByFeature = new Map(saved.map((unlock) => [unlock.feature, unlock]));

  return fallback.map((seedUnlock) => {
    const existing = savedByFeature.get(seedUnlock.feature);
    if (!existing) {
      return seedUnlock;
    }

    return {
      ...seedUnlock,
      ...existing,
    };
  });
}

export function loadHabitQuestData(): HabitQuestData {
  const fallback = createSeedData();

  if (!isBrowser()) {
    return fallback;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return fallback;
    }

    const parsed = JSON.parse(rawValue) as Partial<HabitQuestData> | null;
    if (!parsed) {
      return fallback;
    }

    return {
      habits: parsed.habits ?? fallback.habits,
      completions: parsed.completions ?? fallback.completions,
      achievements: mergeAchievements(parsed.achievements, fallback.achievements),
      challenges: mergeChallenges(parsed.challenges, fallback.challenges),
      shopItems: mergeShopItems(parsed.shopItems, fallback.shopItems),
      equippedItems: {
        ...fallback.equippedItems,
        ...(parsed.equippedItems ?? {}),
      },
      wallet: {
        ...fallback.wallet,
        ...(parsed.wallet ?? {}),
      },
      dailyRewards: {
        ...fallback.dailyRewards,
        ...(parsed.dailyRewards ?? {}),
      },
      levelUnlocks: mergeLevelUnlocks(parsed.levelUnlocks, fallback.levelUnlocks),
      userProgress: {
        ...fallback.userProgress,
        ...(parsed.userProgress ?? {}),
        expHistory: parsed.userProgress?.expHistory ?? fallback.userProgress.expHistory,
      },
    };
  } catch {
    return fallback;
  }
}

export function saveHabitQuestData(data: HabitQuestData) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors to keep the app functional.
  }
}
