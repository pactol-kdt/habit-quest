import type {
  Achievement,
  Challenge,
  CoinWallet,
  DailyRewardState,
  EquippedItems,
  ExpHistoryEntry,
  Habit,
  HabitCompletion,
  HabitQuestData,
  LevelUnlock,
  QuestArc,
  RewardSystems,
  SeasonPassState,
  ShopItem,
  UserProgress,
  UserSettings,
} from "./types";

/** Surgical response: only slices that a command actually changed. */
export type GamePatch = {
  updatedAt?: string;
  wallet?: CoinWallet;
  userProgress?: Pick<
    UserProgress,
    | "totalExp"
    | "level"
    | "currentStreak"
    | "bestStreak"
    | "totalCompletedHabits"
    | "lastCompletedDate"
  >;
  /** Newly appended exp history lines only. */
  expHistory?: ExpHistoryEntry[];
  removedExpHistoryIds?: string[];
  completions?: HabitCompletion[];
  removedCompletions?: Array<{ habitId: string; date: string }>;
  habits?: Habit[];
  deletedHabitIds?: string[];
  rewardSystems?: RewardSystems;
  challenges?: Challenge[];
  questArcs?: QuestArc[];
  achievements?: Achievement[];
  seasonPass?: SeasonPassState;
  levelUnlocks?: LevelUnlock[];
  dailyRewards?: DailyRewardState;
  shopItems?: ShopItem[];
  shopOwnedIds?: string[];
  equippedItems?: EquippedItems;
  settings?: UserSettings;
  deltas?: { exp: number; coins: number; leveledUp: boolean };
};

function stableJson(value: unknown) {
  return JSON.stringify(value);
}

function progressCore(progress: UserProgress) {
  return {
    totalExp: progress.totalExp,
    level: progress.level,
    currentStreak: progress.currentStreak,
    bestStreak: progress.bestStreak,
    totalCompletedHabits: progress.totalCompletedHabits,
    lastCompletedDate: progress.lastCompletedDate,
  };
}

function changedById<T extends { id: string }>(before: T[], after: T[]): T[] | undefined {
  const beforeMap = new Map(before.map((entry) => [entry.id, entry]));
  const changed = after.filter((entry) => {
    const prev = beforeMap.get(entry.id);
    return !prev || stableJson(prev) !== stableJson(entry);
  });
  return changed.length ? changed : undefined;
}

function changedAchievements(before: Achievement[], after: Achievement[]): Achievement[] | undefined {
  const beforeMap = new Map(before.map((entry) => [entry.id, entry]));
  const changed = after.filter((entry) => {
    const prev = beforeMap.get(entry.id);
    return !prev || stableJson(prev) !== stableJson(entry);
  });
  return changed.length ? changed : undefined;
}

function changedLevelUnlocks(before: LevelUnlock[], after: LevelUnlock[]): LevelUnlock[] | undefined {
  const beforeMap = new Map(before.map((entry) => [entry.feature, entry]));
  const changed = after.filter((entry) => {
    const prev = beforeMap.get(entry.feature);
    return !prev || stableJson(prev) !== stableJson(entry);
  });
  return changed.length ? changed : undefined;
}

function changedShopOwned(before: ShopItem[], after: ShopItem[]): ShopItem[] | undefined {
  const beforeOwned = new Map(before.map((entry) => [entry.id, entry.owned]));
  const changed = after.filter((entry) => beforeOwned.get(entry.id) !== entry.owned);
  return changed.length ? changed : undefined;
}

/**
 * Diff two save snapshots into an omit-empty GamePatch.
 * Completions / habits / exp lines are reported as additions and removals.
 */
export function buildGamePatch(before: HabitQuestData, after: HabitQuestData): GamePatch {
  const patch: GamePatch = {};

  if (stableJson(before.wallet) !== stableJson(after.wallet)) {
    patch.wallet = after.wallet;
  }

  const beforeProgress = progressCore(before.userProgress);
  const afterProgress = progressCore(after.userProgress);
  if (stableJson(beforeProgress) !== stableJson(afterProgress)) {
    patch.userProgress = afterProgress;
  }

  const beforeExpIds = new Set(before.userProgress.expHistory.map((entry) => entry.id));
  const afterExpIds = new Set(after.userProgress.expHistory.map((entry) => entry.id));
  const newExp = after.userProgress.expHistory.filter((entry) => !beforeExpIds.has(entry.id));
  const removedExp = before.userProgress.expHistory
    .filter((entry) => !afterExpIds.has(entry.id))
    .map((entry) => entry.id);
  if (newExp.length) {
    patch.expHistory = newExp;
  }
  if (removedExp.length) {
    patch.removedExpHistoryIds = removedExp;
  }

  const beforeCompletionKeys = new Set(
    before.completions.map((entry) => `${entry.habitId}:${entry.date}`),
  );
  const afterCompletionKeys = new Set(
    after.completions.map((entry) => `${entry.habitId}:${entry.date}`),
  );
  const addedCompletions = after.completions.filter(
    (entry) => !beforeCompletionKeys.has(`${entry.habitId}:${entry.date}`),
  );
  const removedCompletions = before.completions
    .filter((entry) => !afterCompletionKeys.has(`${entry.habitId}:${entry.date}`))
    .map((entry) => ({ habitId: entry.habitId, date: entry.date }));
  if (addedCompletions.length) {
    patch.completions = addedCompletions;
  }
  if (removedCompletions.length) {
    patch.removedCompletions = removedCompletions;
  }

  const beforeHabitIds = new Set(before.habits.map((habit) => habit.id));
  const afterHabitIds = new Set(after.habits.map((habit) => habit.id));
  const habitChanges = changedById(before.habits, after.habits);
  if (habitChanges) {
    patch.habits = habitChanges;
  }
  const deletedHabitIds = before.habits
    .filter((habit) => !afterHabitIds.has(habit.id))
    .map((habit) => habit.id);
  if (deletedHabitIds.length) {
    patch.deletedHabitIds = deletedHabitIds;
  }
  // Newly created habits are already in habitChanges via changedById when before lacked them.
  void beforeHabitIds;

  if (stableJson(before.rewardSystems) !== stableJson(after.rewardSystems)) {
    patch.rewardSystems = after.rewardSystems;
  }

  const challenges = changedById(before.challenges, after.challenges);
  if (challenges) {
    patch.challenges = challenges;
  }

  const questArcs = changedById(before.questArcs, after.questArcs);
  if (questArcs) {
    patch.questArcs = questArcs;
  }

  const achievements = changedAchievements(before.achievements, after.achievements);
  if (achievements) {
    patch.achievements = achievements;
  }

  if (stableJson(before.seasonPass) !== stableJson(after.seasonPass)) {
    patch.seasonPass = after.seasonPass;
  }

  const levelUnlocks = changedLevelUnlocks(before.levelUnlocks, after.levelUnlocks);
  if (levelUnlocks) {
    patch.levelUnlocks = levelUnlocks;
  }

  if (stableJson(before.dailyRewards) !== stableJson(after.dailyRewards)) {
    patch.dailyRewards = after.dailyRewards;
  }

  const shopChanged = changedShopOwned(before.shopItems, after.shopItems);
  if (shopChanged) {
    patch.shopItems = after.shopItems;
    patch.shopOwnedIds = after.shopItems.filter((item) => item.owned).map((item) => item.id);
  }

  if (stableJson(before.equippedItems) !== stableJson(after.equippedItems)) {
    patch.equippedItems = after.equippedItems;
  }

  if (stableJson(before.settings) !== stableJson(after.settings)) {
    patch.settings = after.settings;
  }

  const coinDelta = after.wallet.totalCoins - before.wallet.totalCoins;
  const expDelta = after.userProgress.totalExp - before.userProgress.totalExp;
  const leveledUp = after.userProgress.level > before.userProgress.level;
  if (coinDelta !== 0 || expDelta !== 0 || leveledUp) {
    patch.deltas = { exp: expDelta, coins: coinDelta, leveledUp };
  }

  return patch;
}

export function isEmptyGamePatch(patch: GamePatch) {
  const { updatedAt: _u, deltas: _d, ...rest } = patch;
  return Object.keys(rest).length === 0;
}

/** Merge a GamePatch into HabitQuestData. Only provided slices are applied. */
export function applyGamePatch(data: HabitQuestData, patch: GamePatch): HabitQuestData {
  let next: HabitQuestData = { ...data };

  if (patch.wallet) {
    next = { ...next, wallet: patch.wallet };
  }

  if (patch.userProgress || patch.expHistory || patch.removedExpHistoryIds) {
    let expHistory = next.userProgress.expHistory;
    if (patch.removedExpHistoryIds?.length) {
      const remove = new Set(patch.removedExpHistoryIds);
      expHistory = expHistory.filter((entry) => !remove.has(entry.id));
    }
    if (patch.expHistory?.length) {
      const existing = new Set(expHistory.map((entry) => entry.id));
      const additions = patch.expHistory.filter((entry) => !existing.has(entry.id));
      expHistory = [...additions, ...expHistory];
    }
    next = {
      ...next,
      userProgress: {
        ...next.userProgress,
        ...(patch.userProgress ?? {}),
        expHistory,
      },
    };
  }

  if (patch.completions?.length || patch.removedCompletions?.length) {
    let completions = next.completions;
    if (patch.removedCompletions?.length) {
      const remove = new Set(
        patch.removedCompletions.map((entry) => `${entry.habitId}:${entry.date}`),
      );
      completions = completions.filter(
        (entry) => !remove.has(`${entry.habitId}:${entry.date}`),
      );
    }
    if (patch.completions?.length) {
      const removeKeys = new Set(
        patch.completions.map((entry) => `${entry.habitId}:${entry.date}`),
      );
      completions = [
        ...patch.completions,
        ...completions.filter((entry) => !removeKeys.has(`${entry.habitId}:${entry.date}`)),
      ];
    }
    next = { ...next, completions };
  }

  if (patch.habits?.length) {
    const byId = new Map(next.habits.map((habit) => [habit.id, habit]));
    for (const habit of patch.habits) {
      byId.set(habit.id, habit);
    }
    next = { ...next, habits: [...byId.values()] };
  }

  if (patch.deletedHabitIds?.length) {
    const remove = new Set(patch.deletedHabitIds);
    next = { ...next, habits: next.habits.filter((habit) => !remove.has(habit.id)) };
  }

  if (patch.rewardSystems) {
    next = { ...next, rewardSystems: patch.rewardSystems };
  }

  if (patch.challenges) {
    const byId = new Map(next.challenges.map((entry) => [entry.id, entry]));
    for (const challenge of patch.challenges) {
      byId.set(challenge.id, challenge);
    }
    next = { ...next, challenges: [...byId.values()] };
  }

  if (patch.questArcs) {
    const byId = new Map(next.questArcs.map((entry) => [entry.id, entry]));
    for (const arc of patch.questArcs) {
      byId.set(arc.id, arc);
    }
    next = { ...next, questArcs: [...byId.values()] };
  }

  if (patch.achievements) {
    const byId = new Map(next.achievements.map((entry) => [entry.id, entry]));
    for (const achievement of patch.achievements) {
      byId.set(achievement.id, achievement);
    }
    next = { ...next, achievements: [...byId.values()] };
  }

  if (patch.seasonPass) {
    next = { ...next, seasonPass: patch.seasonPass };
  }

  if (patch.levelUnlocks) {
    const byFeature = new Map(next.levelUnlocks.map((entry) => [entry.feature, entry]));
    for (const unlock of patch.levelUnlocks) {
      byFeature.set(unlock.feature, unlock);
    }
    next = { ...next, levelUnlocks: next.levelUnlocks.map((entry) => byFeature.get(entry.feature) ?? entry) };
  }

  if (patch.dailyRewards) {
    next = { ...next, dailyRewards: patch.dailyRewards };
  }

  if (patch.shopItems) {
    next = { ...next, shopItems: patch.shopItems };
  } else if (patch.shopOwnedIds) {
    const owned = new Set(patch.shopOwnedIds);
    next = {
      ...next,
      shopItems: next.shopItems.map((item) => ({
        ...item,
        owned: owned.has(item.id) || item.owned,
      })),
    };
  }

  if (patch.equippedItems) {
    next = { ...next, equippedItems: patch.equippedItems };
  }

  if (patch.settings) {
    next = { ...next, settings: patch.settings };
  }

  return next;
}
