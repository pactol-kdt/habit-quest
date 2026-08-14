import { DEFAULT_SETTINGS, SAVE_VERSION, STORAGE_KEY } from "~/lib/habitquest/constants";
import { normalizeHabitRecord } from "~/lib/habitquest/habit-loop";
import type { HabitQuestCatalog } from "~/lib/habitquest/catalog";
import { createSeedData } from "~/lib/habitquest/seed";
import { getTodayDateKey } from "~/lib/habitquest/utils";
import type {
  Achievement,
  Challenge,
  HabitQuestData,
  LevelUnlock,
  QuestArc,
  ShopItem,
  UserSettings,
} from "~/types/habitquest";

function isBrowser() {
  return typeof window !== "undefined";
}

function mergeAchievements(
  saved: Array<Partial<Achievement> & { key: string }> | undefined,
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
      key: seedAchievement.key,
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
  saved: Array<Partial<ShopItem> & { id: string }> | undefined,
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
      id: seedItem.id,
      owned: Boolean(existing.owned) || seedItem.owned,
      // Catalog owns visual tokens; saves only own ownership/equip state.
      themeVars: seedItem.themeVars ?? existing.themeVars,
      name: seedItem.name,
      description: seedItem.description,
      preview: seedItem.preview,
      price: seedItem.price,
      rarity: seedItem.rarity,
      requiredLevel: seedItem.requiredLevel,
      requiredFeature: seedItem.requiredFeature,
      exclusive: seedItem.exclusive,
      category: seedItem.category,
    };
  });
}

function mergeLevelUnlocks(
  saved: Array<Partial<LevelUnlock> & { feature: LevelUnlock["feature"] }> | undefined,
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
      id: existing.id ?? seedUnlock.id,
      unlocked: Boolean(existing.unlocked),
      unlockedAt: existing.unlockedAt ?? null,
    };
  });
}

function mergeQuestArcs(
  saved: Array<Partial<QuestArc> & { key: string }> | undefined,
  fallback: HabitQuestData["questArcs"],
): QuestArc[] {
  if (!saved?.length) {
    return fallback;
  }

  const savedByKey = new Map(saved.map((arc) => [arc.key, arc]));

  return fallback.map((seedArc) => {
    const existing = savedByKey.get(seedArc.key);
    if (!existing) {
      return seedArc;
    }

    return {
      ...seedArc,
      ...existing,
      key: seedArc.key,
      reward: {
        ...seedArc.reward,
        ...(existing.reward ?? {}),
      },
    };
  });
}

function mergeSettings(
  saved: Partial<UserSettings> | undefined,
  options: { legacySave?: boolean } = {},
): UserSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...(saved ?? {}),
    displayName: saved?.displayName?.trim() ?? DEFAULT_SETTINGS.displayName,
    reminderTime: saved?.reminderTime || DEFAULT_SETTINGS.reminderTime,
    onboardingCompleted:
      saved?.onboardingCompleted ??
      (options.legacySave ? true : DEFAULT_SETTINGS.onboardingCompleted),
  };
}

function buildFallback(catalog?: HabitQuestCatalog): HabitQuestData {
  const fallback = createSeedData();
  if (!catalog) {
    return fallback;
  }

  return {
    ...fallback,
    shopItems: catalog.shopItems,
    achievements: catalog.achievements,
    challenges: catalog.challenges,
    levelUnlocks: catalog.levelUnlocks,
    questArcs: catalog.questArcs,
    seasonPass: {
      ...fallback.seasonPass,
      rewards: catalog.seasonRewards.length
        ? catalog.seasonRewards
        : fallback.seasonPass.rewards,
    },
  };
}

export function normalizeHabitQuestData(
  parsed: Partial<HabitQuestData> | null,
  catalog?: HabitQuestCatalog,
): HabitQuestData {
  const fallback = buildFallback(catalog);

  if (!parsed) {
    return fallback;
  }

  const legacySave = parsed.settings === undefined;

  return {
    version: SAVE_VERSION,
    habits: (parsed.habits ?? fallback.habits).map((habit) =>
      normalizeHabitRecord(habit as Parameters<typeof normalizeHabitRecord>[0]),
    ),
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
    settings: mergeSettings(parsed.settings, { legacySave }),
    rewardSystems: {
      ...fallback.rewardSystems,
      streakFreezes:
        parsed.rewardSystems?.streakFreezes ?? fallback.rewardSystems.streakFreezes,
      streakShieldDates:
        parsed.rewardSystems?.streakShieldDates ?? fallback.rewardSystems.streakShieldDates,
      lastFreezeUsedDate:
        parsed.rewardSystems?.lastFreezeUsedDate ?? fallback.rewardSystems.lastFreezeUsedDate,
      lastComebackDate:
        parsed.rewardSystems?.lastComebackDate ?? fallback.rewardSystems.lastComebackDate,
      todayCombo: parsed.rewardSystems?.todayCombo ?? fallback.rewardSystems.todayCombo,
      comboDate: parsed.rewardSystems?.comboDate ?? fallback.rewardSystems.comboDate,
      progressSettledThroughDate:
        parsed.rewardSystems?.progressSettledThroughDate ??
        fallback.rewardSystems.progressSettledThroughDate ??
        null,
    },
    questArcs: mergeQuestArcs(parsed.questArcs, fallback.questArcs),
    seasonPass: {
      ...fallback.seasonPass,
      ...(parsed.seasonPass ?? {}),
      rewards: parsed.seasonPass?.rewards?.length
        ? parsed.seasonPass.rewards
        : fallback.seasonPass.rewards,
      claimedLevels:
        parsed.seasonPass?.claimedLevels ?? fallback.seasonPass.claimedLevels,
    },
    weeklyBoss: {
      ...fallback.weeklyBoss,
      ...(parsed.weeklyBoss ?? {}),
      settledThroughDate:
        parsed.weeklyBoss?.settledThroughDate ??
        fallback.weeklyBoss.settledThroughDate ??
        null,
    },
  };
}

function pickLaterDateKey(a: string | null | undefined, b: string | null | undefined) {
  if (!a) {
    return b ?? null;
  }
  if (!b) {
    return a;
  }
  return a >= b ? a : b;
}

/**
 * When cloud pull races ahead of a focused write, the browser cache may still
 * hold newer clears / undos / purchases. Merge carefully — today's pending
 * clears prefer the local set so undos stick.
 */
export function mergeCloudSaveWithLocalDraft(
  cloud: HabitQuestData,
  local: HabitQuestData | null,
  today = getTodayDateKey(),
): { data: HabitQuestData; shouldPush: boolean } {
  if (!local) {
    return { data: cloud, shouldPush: false };
  }

  const mergedDailyRewards = {
    lastLoginDate: pickLaterDateKey(
      local.dailyRewards.lastLoginDate,
      cloud.dailyRewards.lastLoginDate,
    ),
    claimedDailyLoginDate: pickLaterDateKey(
      local.dailyRewards.claimedDailyLoginDate,
      cloud.dailyRewards.claimedDailyLoginDate,
    ),
    claimedDailyCompletionRewardDate: pickLaterDateKey(
      local.dailyRewards.claimedDailyCompletionRewardDate,
      cloud.dailyRewards.claimedDailyCompletionRewardDate,
    ),
  };

  const localDailyAhead =
    mergedDailyRewards.claimedDailyLoginDate !== cloud.dailyRewards.claimedDailyLoginDate ||
    mergedDailyRewards.claimedDailyCompletionRewardDate !==
      cloud.dailyRewards.claimedDailyCompletionRewardDate ||
    mergedDailyRewards.lastLoginDate !== cloud.dailyRewards.lastLoginDate;

  const localHasExtraCompletions = local.completions.some(
    (completion) =>
      !cloud.completions.some(
        (entry) => entry.habitId === completion.habitId && entry.date === completion.date,
      ),
  );
  const localToday = local.completions.filter((completion) => completion.date === today);
  const cloudToday = cloud.completions.filter((completion) => completion.date === today);
  const localRemovedTodayClear = cloudToday.some(
    (completion) =>
      !localToday.some(
        (entry) => entry.habitId === completion.habitId && entry.date === completion.date,
      ),
  );

  const localLooksStale =
    local.userProgress.totalExp + 25 < cloud.userProgress.totalExp ||
    local.wallet.lifetimeCoinsEarned + 50 < cloud.wallet.lifetimeCoinsEarned;

  // Pending-only local drafts can look "stale" by settled EXP — still keep them
  // when they clearly have clears, undos, or a newer daily-login claim.
  if (
    localLooksStale &&
    !localHasExtraCompletions &&
    !localRemovedTodayClear &&
    !localDailyAhead
  ) {
    return { data: cloud, shouldPush: false };
  }

  const completionByKey = new Map<string, HabitQuestData["completions"][number]>();

  // Non-today: union cloud + local.
  for (const completion of cloud.completions) {
    if (completion.date === today) {
      continue;
    }
    completionByKey.set(`${completion.habitId}:${completion.date}`, completion);
  }
  for (const completion of local.completions) {
    if (completion.date === today) {
      continue;
    }
    const key = `${completion.habitId}:${completion.date}`;
    if (!completionByKey.has(key)) {
      completionByKey.set(key, completion);
    }
  }

  // Today: prefer local set (supports pending undos + unsynced clears).
  const preferLocalToday =
    !localLooksStale || localHasExtraCompletions || localRemovedTodayClear;
  const todaySource = preferLocalToday ? localToday : cloudToday;
  for (const completion of todaySource) {
    completionByKey.set(`${completion.habitId}:${completion.date}`, completion);
  }

  let addedCompletions = localHasExtraCompletions || localRemovedTodayClear;

  // Cloud owns habit membership. Re-adding local-only IDs resurrected habits after
  // surgical deletes whenever a stale browser draft was merged on boot/sync.
  const habitById = new Map(cloud.habits.map((habit) => [habit.id, habit]));
  let habitsChanged = false;
  for (const localHabit of local.habits) {
    const cloudHabit = habitById.get(localHabit.id);
    if (!cloudHabit) {
      continue;
    }
    if (localHabit.updatedAt > cloudHabit.updatedAt) {
      habitById.set(localHabit.id, localHabit);
      habitsChanged = true;
    }
  }

  const ownedIds = new Set<string>();
  for (const item of cloud.shopItems) {
    if (item.owned) {
      ownedIds.add(item.id);
    }
  }
  for (const item of local.shopItems) {
    if (item.owned) {
      ownedIds.add(item.id);
    }
  }

  const cloudOwnedCount = cloud.shopItems.filter((item) => item.owned).length;
  const localSpentMore =
    local.wallet.lifetimeCoinsSpent > cloud.wallet.lifetimeCoinsSpent;
  const addedOwned = ownedIds.size > cloudOwnedCount;

  if (
    !addedCompletions &&
    !habitsChanged &&
    !addedOwned &&
    !localSpentMore &&
    !localDailyAhead
  ) {
    return { data: cloud, shouldPush: false };
  }

  const lifetimeCoinsEarned = Math.max(
    local.wallet.lifetimeCoinsEarned,
    cloud.wallet.lifetimeCoinsEarned,
  );
  const lifetimeCoinsSpent = Math.max(
    local.wallet.lifetimeCoinsSpent,
    cloud.wallet.lifetimeCoinsSpent,
  );

  function pickEquip(preferred: string | null, fallback: string | null) {
    if (preferred && ownedIds.has(preferred)) {
      return preferred;
    }
    if (fallback && ownedIds.has(fallback)) {
      return fallback;
    }
    return null;
  }

  const completions = [...completionByKey.values()].sort((a, b) =>
    a.date === b.date
      ? b.completedAt.localeCompare(a.completedAt)
      : b.date.localeCompare(a.date),
  );

  const todayCombo = completions.filter((completion) => completion.date === today).length;

  return {
    data: {
      ...cloud,
      habits: [...habitById.values()],
      completions,
      dailyRewards: mergedDailyRewards,
      shopItems: cloud.shopItems.map((item) => ({
        ...item,
        owned: ownedIds.has(item.id),
      })),
      wallet: {
        lifetimeCoinsEarned,
        lifetimeCoinsSpent,
        totalCoins: Math.max(0, lifetimeCoinsEarned - lifetimeCoinsSpent),
      },
      equippedItems: {
        titleItemId: pickEquip(
          local.equippedItems.titleItemId,
          cloud.equippedItems.titleItemId,
        ),
        frameItemId: pickEquip(
          local.equippedItems.frameItemId,
          cloud.equippedItems.frameItemId,
        ),
        avatarItemId: pickEquip(
          local.equippedItems.avatarItemId,
          cloud.equippedItems.avatarItemId,
        ),
        themeItemId: pickEquip(
          local.equippedItems.themeItemId,
          cloud.equippedItems.themeItemId,
        ),
      },
      rewardSystems: {
        ...cloud.rewardSystems,
        todayCombo,
        comboDate: todayCombo > 0 ? today : null,
      },
    },
    shouldPush: true,
  };
}

export function peekHabitQuestLocalSave(): HabitQuestData | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<HabitQuestData> | null;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    if (!Array.isArray(parsed.habits) || !Array.isArray(parsed.completions)) {
      return null;
    }

    return normalizeHabitQuestData(parsed);
  } catch {
    return null;
  }
}

/**
 * True when this browser has guest progress worth migrating into an account.
 */
export function hasExtractableLocalProgress(data: HabitQuestData | null): boolean {
  if (!data) {
    return false;
  }

  return (
    data.completions.length > 0 ||
    data.userProgress.totalExp > 0 ||
    data.userProgress.totalCompletedHabits > 0 ||
    data.wallet.lifetimeCoinsEarned > 0 ||
    data.wallet.lifetimeCoinsSpent > 0 ||
    Boolean(data.settings.displayName.trim()) ||
    data.shopItems.some((item) => item.owned) ||
    data.achievements.some((achievement) => achievement.unlocked) ||
    data.settings.onboardingCompleted
  );
}

export function loadHabitQuestData(): HabitQuestData {
  const peeked = peekHabitQuestLocalSave();
  return peeked ?? createSeedData();
}

export function saveHabitQuestData(data: HabitQuestData) {
  if (!isBrowser()) {
    return;
  }

  // Always write a local cache — signed-in play still needs this so a refresh
  // before the cloud flush finishes does not wipe purchases / spends.
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...data,
        version: SAVE_VERSION,
      }),
    );
  } catch {
    // Ignore storage errors to keep the app functional.
  }
}

export function clearHabitQuestData() {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
}

export function exportHabitQuestData(data: HabitQuestData) {
  return JSON.stringify(
    {
      ...data,
      version: SAVE_VERSION,
      exportedAt: new Date().toISOString(),
    },
    null,
    2,
  );
}

export function parseImportedHabitQuestData(rawValue: string): HabitQuestData | null {
  try {
    const parsed = JSON.parse(rawValue) as Partial<HabitQuestData> | null;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    if (!Array.isArray(parsed.habits) || !Array.isArray(parsed.completions)) {
      return null;
    }

    return normalizeHabitQuestData(parsed);
  } catch {
    return null;
  }
}
