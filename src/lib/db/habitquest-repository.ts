import "server-only";

import { and, eq } from "drizzle-orm";
import { SAVE_VERSION, UNLOCK_LABELS } from "~/lib/habitquest/constants";
import type { HabitQuestCatalog } from "~/lib/habitquest/catalog";
import { normalizeHabitQuestData } from "~/lib/habitquest/storage";
import { db } from "~/lib/db";
import { loadCatalogFromDb } from "~/lib/db/catalog-repository";
import {
  dailyRewards,
  equippedCosmetics,
  expHistory,
  habitCompletions,
  habits,
  habitquestSaves,
  ownedShopItems,
  rewardSystems,
  saveMeta,
  seasonPasses,
  userAchievements,
  userChallenges,
  userLevelUnlocks,
  userProgress,
  userQuestArcs,
  userSettings,
  wallets,
  weeklyBosses,
} from "~/lib/db/schema";
import type {
  Challenge,
  ExpHistoryEntry,
  Habit,
  HabitCompletion,
  HabitQuestData,
  UnlockFeature,
} from "~/types/habitquest";

type Database = typeof db;

export async function userHasNormalizedSave(database: Database, userId: string) {
  const rows = await database
    .select({ userId: saveMeta.userId })
    .from(saveMeta)
    .where(eq(saveMeta.userId, userId))
    .limit(1);
  return Boolean(rows[0]);
}

export async function loadNormalizedSave(
  database: Database,
  userId: string,
  catalog?: HabitQuestCatalog,
): Promise<{ data: HabitQuestData; updatedAt: string; version: number } | null> {
  const metaRows = await database.select().from(saveMeta).where(eq(saveMeta.userId, userId)).limit(1);
  const meta = metaRows[0];
  if (!meta) {
    return null;
  }

  const resolvedCatalog = catalog ?? (await loadCatalogFromDb(database));

  const [
    habitRows,
    completionRows,
    expRows,
    walletRows,
    progressRows,
    dailyRows,
    settingsRows,
    equippedRows,
    ownedRows,
    achievementRows,
    challengeRows,
    unlockRows,
    rewardRows,
    questRows,
    seasonRows,
    bossRows,
  ] = await Promise.all([
    database.select().from(habits).where(eq(habits.userId, userId)),
    database.select().from(habitCompletions).where(eq(habitCompletions.userId, userId)),
    database.select().from(expHistory).where(eq(expHistory.userId, userId)),
    database.select().from(wallets).where(eq(wallets.userId, userId)).limit(1),
    database.select().from(userProgress).where(eq(userProgress.userId, userId)).limit(1),
    database.select().from(dailyRewards).where(eq(dailyRewards.userId, userId)).limit(1),
    database.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1),
    database.select().from(equippedCosmetics).where(eq(equippedCosmetics.userId, userId)).limit(1),
    database.select().from(ownedShopItems).where(eq(ownedShopItems.userId, userId)),
    database.select().from(userAchievements).where(eq(userAchievements.userId, userId)),
    database.select().from(userChallenges).where(eq(userChallenges.userId, userId)),
    database.select().from(userLevelUnlocks).where(eq(userLevelUnlocks.userId, userId)),
    database.select().from(rewardSystems).where(eq(rewardSystems.userId, userId)).limit(1),
    database.select().from(userQuestArcs).where(eq(userQuestArcs.userId, userId)),
    database.select().from(seasonPasses).where(eq(seasonPasses.userId, userId)).limit(1),
    database.select().from(weeklyBosses).where(eq(weeklyBosses.userId, userId)).limit(1),
  ]);

  const ownedIds = new Set(ownedRows.map((row) => row.itemId));
  const achievementByKey = new Map(
    achievementRows.map((row) => [row.achievementKey, row] as const),
  );
  const unlockByFeature = new Map(unlockRows.map((row) => [row.feature, row] as const));
  const questByKey = new Map(questRows.map((row) => [row.questKey, row] as const));

  const partial = {
    version: meta.version,
    habits: habitRows.map(
      (row): Habit => ({
        id: row.id,
        title: row.title,
        description: row.description,
        difficulty: row.difficulty as Habit["difficulty"],
        recurrence: row.recurrence as Habit["recurrence"],
        customDays: Array.isArray(row.customDays) ? row.customDays : [],
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }),
    ),
    completions: completionRows.map(
      (row): HabitCompletion => ({
        id: row.id,
        habitId: row.habitId,
        date: row.date,
        expEarned: row.expEarned,
        streakBonusExp: row.streakBonusExp,
        completedAt: row.completedAt,
        crit: row.crit || undefined,
      }),
    ),
    wallet: walletRows[0]
      ? {
          totalCoins: walletRows[0].totalCoins,
          lifetimeCoinsEarned: walletRows[0].lifetimeCoinsEarned,
          lifetimeCoinsSpent: walletRows[0].lifetimeCoinsSpent,
        }
      : undefined,
    userProgress: progressRows[0]
      ? {
          totalExp: progressRows[0].totalExp,
          level: progressRows[0].level,
          currentStreak: progressRows[0].currentStreak,
          bestStreak: progressRows[0].bestStreak,
          totalCompletedHabits: progressRows[0].totalCompletedHabits,
          lastCompletedDate: progressRows[0].lastCompletedDate,
          expHistory: expRows.map(
            (row): ExpHistoryEntry => ({
              id: row.id,
              date: row.date,
              amount: row.amount,
              source: row.source as ExpHistoryEntry["source"],
              label: row.label,
            }),
          ),
        }
      : undefined,
    dailyRewards: dailyRows[0]
      ? {
          lastLoginDate: dailyRows[0].lastLoginDate,
          claimedDailyLoginDate: dailyRows[0].claimedDailyLoginDate,
          claimedDailyCompletionRewardDate: dailyRows[0].claimedDailyCompletionRewardDate,
        }
      : undefined,
    settings: settingsRows[0]
      ? {
          displayName: settingsRows[0].displayName,
          onboardingCompleted: settingsRows[0].onboardingCompleted,
          remindersEnabled: settingsRows[0].remindersEnabled,
          reminderTime: settingsRows[0].reminderTime,
        }
      : undefined,
    equippedItems: equippedRows[0]
      ? {
          titleItemId: equippedRows[0].titleItemId,
          frameItemId: equippedRows[0].frameItemId,
          avatarItemId: equippedRows[0].avatarItemId,
          themeItemId: equippedRows[0].themeItemId,
        }
      : undefined,
    shopItems: [...ownedIds].map((itemId) => ({
      id: itemId,
      owned: true as const,
    })),
    achievements: [...achievementByKey.entries()].map(([key, row]) => ({
      key,
      unlocked: row.unlocked,
      unlockedAt: row.unlockedAt,
      rewardedAt: row.rewardedAt,
    })),
    challenges: challengeRows.map(
      (row): Challenge => ({
        id: row.id,
        key: row.challengeKey,
        title: row.title,
        description: row.description,
        period: row.period as Challenge["period"],
        type: row.type as Challenge["type"],
        target: row.target,
        progress: row.progress,
        completed: row.completed,
        claimed: row.claimed,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        reward: {
          coins: row.rewardCoins,
          exp: row.rewardExp,
          titleItemId: row.rewardTitleItemId,
        },
      }),
    ),
    levelUnlocks: [...unlockByFeature.entries()]
      .filter(([feature]) => feature in UNLOCK_LABELS)
      .map(([feature, row]) => ({
      feature: feature as UnlockFeature,
      unlocked: row.unlocked,
      unlockedAt: row.unlockedAt,
    })),
    rewardSystems: rewardRows[0]
      ? {
          streakFreezes: rewardRows[0].streakFreezes,
          streakShieldDates: Array.isArray(rewardRows[0].streakShieldDates)
            ? rewardRows[0].streakShieldDates
            : [],
          lastFreezeUsedDate: rewardRows[0].lastFreezeUsedDate,
          lastComebackDate: rewardRows[0].lastComebackDate,
          todayCombo: rewardRows[0].todayCombo,
          comboDate: rewardRows[0].comboDate,
          progressSettledThroughDate: rewardRows[0].progressSettledThroughDate ?? null,
        }
      : undefined,
    questArcs: [...questByKey.entries()].map(([key, row]) => ({
      key,
      id: row.id,
      progress: row.progress,
      completed: row.completed,
      claimed: row.claimed,
    })),
    seasonPass: seasonRows[0]
      ? {
          seasonKey: seasonRows[0].seasonKey,
          xp: seasonRows[0].xp,
          level: seasonRows[0].level,
          claimedLevels: Array.isArray(seasonRows[0].claimedLevels)
            ? seasonRows[0].claimedLevels
            : [],
          rewards: [],
        }
      : undefined,
    weeklyBoss: bossRows[0]
      ? {
          weekKey: bossRows[0].weekKey,
          name: bossRows[0].name,
          maxHp: bossRows[0].maxHp,
          currentHp: bossRows[0].currentHp,
          defeated: bossRows[0].defeated,
          rewardClaimed: bossRows[0].rewardClaimed,
          settledThroughDate: bossRows[0].settledThroughDate ?? null,
        }
      : undefined,
  } as Partial<HabitQuestData>;

  return {
    data: normalizeHabitQuestData(partial, resolvedCatalog),
    updatedAt: meta.updatedAt,
    version: meta.version,
  };
}

export async function replaceNormalizedSave(
  database: Database,
  userId: string,
  data: HabitQuestData,
) {
  const updatedAt = new Date().toISOString();
  const normalized = normalizeHabitQuestData(data);

  await database.delete(habits).where(eq(habits.userId, userId));
  await database.delete(habitCompletions).where(eq(habitCompletions.userId, userId));
  await database.delete(expHistory).where(eq(expHistory.userId, userId));
  await database.delete(ownedShopItems).where(eq(ownedShopItems.userId, userId));
  await database.delete(userAchievements).where(eq(userAchievements.userId, userId));
  await database.delete(userChallenges).where(eq(userChallenges.userId, userId));
  await database.delete(userLevelUnlocks).where(eq(userLevelUnlocks.userId, userId));
  await database.delete(userQuestArcs).where(eq(userQuestArcs.userId, userId));
  await database.delete(wallets).where(eq(wallets.userId, userId));
  await database.delete(userProgress).where(eq(userProgress.userId, userId));
  await database.delete(dailyRewards).where(eq(dailyRewards.userId, userId));
  await database.delete(userSettings).where(eq(userSettings.userId, userId));
  await database.delete(equippedCosmetics).where(eq(equippedCosmetics.userId, userId));
  await database.delete(rewardSystems).where(eq(rewardSystems.userId, userId));
  await database.delete(seasonPasses).where(eq(seasonPasses.userId, userId));
  await database.delete(weeklyBosses).where(eq(weeklyBosses.userId, userId));
  await database.delete(saveMeta).where(eq(saveMeta.userId, userId));

  if (normalized.habits.length) {
    await database.insert(habits).values(
      normalized.habits.map((habit) => ({
        id: habit.id,
        userId,
        title: habit.title,
        description: habit.description,
        difficulty: habit.difficulty,
        recurrence: habit.recurrence,
        customDays: habit.customDays,
        createdAt: habit.createdAt,
        updatedAt: habit.updatedAt,
      })),
    );
  }

  if (normalized.completions.length) {
    await database.insert(habitCompletions).values(
      normalized.completions.map((completion) => ({
        id: completion.id,
        userId,
        habitId: completion.habitId,
        date: completion.date,
        expEarned: completion.expEarned,
        streakBonusExp: completion.streakBonusExp,
        completedAt: completion.completedAt,
        crit: Boolean(completion.crit),
      })),
    );
  }

  if (normalized.userProgress.expHistory.length) {
    await database.insert(expHistory).values(
      normalized.userProgress.expHistory.map((entry) => ({
        id: entry.id,
        userId,
        date: entry.date,
        amount: entry.amount,
        source: entry.source,
        label: entry.label,
      })),
    );
  }

  await database.insert(wallets).values({
    userId,
    totalCoins: normalized.wallet.totalCoins,
    lifetimeCoinsEarned: normalized.wallet.lifetimeCoinsEarned,
    lifetimeCoinsSpent: normalized.wallet.lifetimeCoinsSpent,
  });

  await database.insert(userProgress).values({
    userId,
    totalExp: normalized.userProgress.totalExp,
    level: normalized.userProgress.level,
    currentStreak: normalized.userProgress.currentStreak,
    bestStreak: normalized.userProgress.bestStreak,
    totalCompletedHabits: normalized.userProgress.totalCompletedHabits,
    lastCompletedDate: normalized.userProgress.lastCompletedDate,
  });

  await database.insert(dailyRewards).values({
    userId,
    lastLoginDate: normalized.dailyRewards.lastLoginDate,
    claimedDailyLoginDate: normalized.dailyRewards.claimedDailyLoginDate,
    claimedDailyCompletionRewardDate: normalized.dailyRewards.claimedDailyCompletionRewardDate,
  });

  await database.insert(userSettings).values({
    userId,
    displayName: normalized.settings.displayName,
    onboardingCompleted: normalized.settings.onboardingCompleted,
    remindersEnabled: normalized.settings.remindersEnabled,
    reminderTime: normalized.settings.reminderTime,
  });

  await database.insert(equippedCosmetics).values({
    userId,
    titleItemId: normalized.equippedItems.titleItemId,
    frameItemId: normalized.equippedItems.frameItemId,
    avatarItemId: normalized.equippedItems.avatarItemId,
    themeItemId: normalized.equippedItems.themeItemId,
  });

  const owned = normalized.shopItems.filter((item) => item.owned);
  if (owned.length) {
    await database.insert(ownedShopItems).values(
      owned.map((item) => ({
        userId,
        itemId: item.id,
      })),
    );
  }

  if (normalized.achievements.length) {
    await database.insert(userAchievements).values(
      normalized.achievements.map((achievement) => ({
        userId,
        achievementKey: achievement.key,
        unlocked: achievement.unlocked,
        unlockedAt: achievement.unlockedAt,
        rewardedAt: achievement.rewardedAt,
      })),
    );
  }

  if (normalized.challenges.length) {
    await database.insert(userChallenges).values(
      normalized.challenges.map((challenge) => ({
        userId,
        challengeKey: challenge.key,
        startsAt: challenge.startsAt,
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        period: challenge.period,
        type: challenge.type,
        target: challenge.target,
        progress: challenge.progress,
        completed: challenge.completed,
        claimed: challenge.claimed,
        endsAt: challenge.endsAt,
        rewardCoins: challenge.reward.coins,
        rewardExp: challenge.reward.exp,
        rewardTitleItemId: challenge.reward.titleItemId,
      })),
    );
  }

  if (normalized.levelUnlocks.length) {
    await database.insert(userLevelUnlocks).values(
      normalized.levelUnlocks.map((unlock) => ({
        userId,
        feature: unlock.feature,
        unlocked: unlock.unlocked,
        unlockedAt: unlock.unlockedAt,
      })),
    );
  }

  await database.insert(rewardSystems).values({
    userId,
    streakFreezes: normalized.rewardSystems.streakFreezes,
    streakShieldDates: normalized.rewardSystems.streakShieldDates,
    lastFreezeUsedDate: normalized.rewardSystems.lastFreezeUsedDate,
    lastComebackDate: normalized.rewardSystems.lastComebackDate,
    todayCombo: normalized.rewardSystems.todayCombo,
    comboDate: normalized.rewardSystems.comboDate,
    partyCode: null,
    partyWeeklyTarget: 20,
    progressSettledThroughDate: normalized.rewardSystems.progressSettledThroughDate,
  });

  if (normalized.questArcs.length) {
    await database.insert(userQuestArcs).values(
      normalized.questArcs.map((arc) => ({
        userId,
        questKey: arc.key,
        id: arc.id,
        progress: arc.progress,
        completed: arc.completed,
        claimed: arc.claimed,
      })),
    );
  }

  await database.insert(seasonPasses).values({
    userId,
    seasonKey: normalized.seasonPass.seasonKey,
    xp: normalized.seasonPass.xp,
    level: normalized.seasonPass.level,
    claimedLevels: normalized.seasonPass.claimedLevels,
  });

  await database.insert(weeklyBosses).values({
    userId,
    weekKey: normalized.weeklyBoss.weekKey,
    name: normalized.weeklyBoss.name,
    maxHp: normalized.weeklyBoss.maxHp,
    currentHp: normalized.weeklyBoss.currentHp,
    defeated: normalized.weeklyBoss.defeated,
    rewardClaimed: normalized.weeklyBoss.rewardClaimed,
    settledThroughDate: normalized.weeklyBoss.settledThroughDate,
  });

  await database.insert(saveMeta).values({
    userId,
    version: SAVE_VERSION,
    updatedAt,
  });

  // Drop legacy blob once rows are authoritative.
  await database.delete(habitquestSaves).where(eq(habitquestSaves.userId, userId));

  return { updatedAt, version: SAVE_VERSION, data: normalized };
}

/** Surgical write for a single day's clear — transactional + combo recount. */
export async function persistTodayHabitCompletion(
  database: Database,
  userId: string,
  completion: HabitCompletion,
) {
  const updatedAt = new Date().toISOString();

  return database.transaction(async (tx) => {
    await tx.insert(habitCompletions).values({
      id: completion.id,
      userId,
      habitId: completion.habitId,
      date: completion.date,
      expEarned: completion.expEarned,
      streakBonusExp: completion.streakBonusExp,
      completedAt: completion.completedAt,
      crit: Boolean(completion.crit),
    });

    const rows = await tx
      .select({ id: habitCompletions.id })
      .from(habitCompletions)
      .where(
        and(
          eq(habitCompletions.userId, userId),
          eq(habitCompletions.date, completion.date),
        ),
      );

    const todayCombo = rows.length;
    const comboDate = todayCombo > 0 ? completion.date : null;

    await tx
      .update(rewardSystems)
      .set({
        todayCombo,
        comboDate,
      })
      .where(eq(rewardSystems.userId, userId));

    await tx
      .update(saveMeta)
      .set({ updatedAt, version: SAVE_VERSION })
      .where(eq(saveMeta.userId, userId));

    return { updatedAt, version: SAVE_VERSION, todayCombo, comboDate };
  });
}

/** Surgical undo for a single day's clear — transactional + combo recount. */
export async function removeTodayHabitCompletion(
  database: Database,
  userId: string,
  habitId: string,
  date: string,
) {
  const updatedAt = new Date().toISOString();

  return database.transaction(async (tx) => {
    await tx
      .delete(habitCompletions)
      .where(
        and(
          eq(habitCompletions.userId, userId),
          eq(habitCompletions.habitId, habitId),
          eq(habitCompletions.date, date),
        ),
      );

    const rows = await tx
      .select({ id: habitCompletions.id })
      .from(habitCompletions)
      .where(
        and(eq(habitCompletions.userId, userId), eq(habitCompletions.date, date)),
      );

    const todayCombo = rows.length;
    const comboDate = todayCombo > 0 ? date : null;

    await tx
      .update(rewardSystems)
      .set({
        todayCombo,
        comboDate,
      })
      .where(eq(rewardSystems.userId, userId));

    await tx
      .update(saveMeta)
      .set({ updatedAt, version: SAVE_VERSION })
      .where(eq(saveMeta.userId, userId));

    return { updatedAt, version: SAVE_VERSION, todayCombo, comboDate };
  });
}

/** Surgical shop purchase — wallet spend + ownership row. */
export async function persistShopPurchase(
  database: Database,
  userId: string,
  itemId: string,
  wallet: {
    totalCoins: number;
    lifetimeCoinsEarned: number;
    lifetimeCoinsSpent: number;
  },
) {
  const updatedAt = new Date().toISOString();

  return database.transaction(async (tx) => {
    await tx
      .update(wallets)
      .set({
        totalCoins: wallet.totalCoins,
        lifetimeCoinsEarned: wallet.lifetimeCoinsEarned,
        lifetimeCoinsSpent: wallet.lifetimeCoinsSpent,
      })
      .where(eq(wallets.userId, userId));

    await tx.insert(ownedShopItems).values({
      userId,
      itemId,
    });

    await tx
      .update(saveMeta)
      .set({ updatedAt, version: SAVE_VERSION })
      .where(eq(saveMeta.userId, userId));

    return { updatedAt, version: SAVE_VERSION, wallet };
  });
}

/** Surgical equip / unequip — only the equipped_cosmetics row. */
export async function persistEquippedCosmetics(
  database: Database,
  userId: string,
  equippedItems: {
    titleItemId: string | null;
    frameItemId: string | null;
    avatarItemId: string | null;
    themeItemId: string | null;
  },
) {
  const updatedAt = new Date().toISOString();

  return database.transaction(async (tx) => {
    await tx
      .update(equippedCosmetics)
      .set({
        titleItemId: equippedItems.titleItemId,
        frameItemId: equippedItems.frameItemId,
        avatarItemId: equippedItems.avatarItemId,
        themeItemId: equippedItems.themeItemId,
      })
      .where(eq(equippedCosmetics.userId, userId));

    await tx
      .update(saveMeta)
      .set({ updatedAt, version: SAVE_VERSION })
      .where(eq(saveMeta.userId, userId));

    return { updatedAt, version: SAVE_VERSION, equippedItems };
  });
}

async function touchSaveMeta(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  userId: string,
  updatedAt: string,
) {
  await tx
    .update(saveMeta)
    .set({ updatedAt, version: SAVE_VERSION })
    .where(eq(saveMeta.userId, userId));
}

async function writeWallet(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  userId: string,
  wallet: {
    totalCoins: number;
    lifetimeCoinsEarned: number;
    lifetimeCoinsSpent: number;
  },
) {
  await tx
    .update(wallets)
    .set({
      totalCoins: wallet.totalCoins,
      lifetimeCoinsEarned: wallet.lifetimeCoinsEarned,
      lifetimeCoinsSpent: wallet.lifetimeCoinsSpent,
    })
    .where(eq(wallets.userId, userId));
}

async function writeUserProgress(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  userId: string,
  progress: {
    totalExp: number;
    level: number;
    currentStreak: number;
    bestStreak: number;
    totalCompletedHabits: number;
    lastCompletedDate: string | null;
  },
) {
  await tx
    .update(userProgress)
    .set({
      totalExp: progress.totalExp,
      level: progress.level,
      currentStreak: progress.currentStreak,
      bestStreak: progress.bestStreak,
      totalCompletedHabits: progress.totalCompletedHabits,
      lastCompletedDate: progress.lastCompletedDate,
    })
    .where(eq(userProgress.userId, userId));
}

/** Surgical habit create. */
export async function persistHabitCreate(
  database: Database,
  userId: string,
  habit: Habit,
) {
  const updatedAt = new Date().toISOString();
  return database.transaction(async (tx) => {
    await tx.insert(habits).values({
      id: habit.id,
      userId,
      title: habit.title,
      description: habit.description,
      difficulty: habit.difficulty,
      recurrence: habit.recurrence,
      customDays: habit.customDays,
      createdAt: habit.createdAt,
      updatedAt: habit.updatedAt,
    });
    await touchSaveMeta(tx, userId, updatedAt);
    return { updatedAt, version: SAVE_VERSION, habit };
  });
}

/** Surgical habit update. */
export async function persistHabitUpdate(
  database: Database,
  userId: string,
  habit: Habit,
) {
  const updatedAt = new Date().toISOString();
  return database.transaction(async (tx) => {
    await tx
      .update(habits)
      .set({
        title: habit.title,
        description: habit.description,
        difficulty: habit.difficulty,
        recurrence: habit.recurrence,
        customDays: habit.customDays,
        updatedAt: habit.updatedAt,
      })
      .where(and(eq(habits.userId, userId), eq(habits.id, habit.id)));
    await touchSaveMeta(tx, userId, updatedAt);
    return { updatedAt, version: SAVE_VERSION, habit };
  });
}

/** Surgical habit delete + optional settled progress clawback. */
export async function persistHabitDelete(
  database: Database,
  userId: string,
  habitId: string,
  progress: {
    totalExp: number;
    level: number;
    currentStreak: number;
    bestStreak: number;
    totalCompletedHabits: number;
    lastCompletedDate: string | null;
  },
  removedExpHistoryIds: string[],
) {
  const updatedAt = new Date().toISOString();
  return database.transaction(async (tx) => {
    await tx
      .delete(habitCompletions)
      .where(
        and(eq(habitCompletions.userId, userId), eq(habitCompletions.habitId, habitId)),
      );
    await tx.delete(habits).where(and(eq(habits.userId, userId), eq(habits.id, habitId)));

    if (removedExpHistoryIds.length) {
      for (const id of removedExpHistoryIds) {
        await tx.delete(expHistory).where(and(eq(expHistory.userId, userId), eq(expHistory.id, id)));
      }
    }

    await writeUserProgress(tx, userId, progress);
    await touchSaveMeta(tx, userId, updatedAt);
    return { updatedAt, version: SAVE_VERSION, habitId };
  });
}

export async function persistUserSettings(
  database: Database,
  userId: string,
  settings: {
    displayName: string;
    onboardingCompleted: boolean;
    remindersEnabled: boolean;
    reminderTime: string;
  },
) {
  const updatedAt = new Date().toISOString();
  return database.transaction(async (tx) => {
    await tx
      .update(userSettings)
      .set({
        displayName: settings.displayName,
        onboardingCompleted: settings.onboardingCompleted,
        remindersEnabled: settings.remindersEnabled,
        reminderTime: settings.reminderTime,
      })
      .where(eq(userSettings.userId, userId));
    await touchSaveMeta(tx, userId, updatedAt);
    return { updatedAt, version: SAVE_VERSION, settings };
  });
}

type EconomyBundle = {
  wallet: {
    totalCoins: number;
    lifetimeCoinsEarned: number;
    lifetimeCoinsSpent: number;
  };
  userProgress: {
    totalExp: number;
    level: number;
    currentStreak: number;
    bestStreak: number;
    totalCompletedHabits: number;
    lastCompletedDate: string | null;
    expHistory: ExpHistoryEntry[];
  };
  newExpEntryIds: string[];
  newOwnedItemIds: string[];
  streakFreezes?: number;
  challenge?: { challengeKey: string; startsAt: string; claimed: boolean };
  quest?: { questKey: string; claimed: boolean };
  seasonClaimedLevels?: number[];
  bossRewardClaimed?: boolean;
};

/** Surgical economy write used by claims / streak freeze. */
export async function persistEconomyClaim(
  database: Database,
  userId: string,
  bundle: EconomyBundle,
) {
  const updatedAt = new Date().toISOString();
  return database.transaction(async (tx) => {
    await writeWallet(tx, userId, bundle.wallet);
    await writeUserProgress(tx, userId, bundle.userProgress);

    const newEntries = bundle.userProgress.expHistory.filter((entry) =>
      bundle.newExpEntryIds.includes(entry.id),
    );
    if (newEntries.length) {
      await tx.insert(expHistory).values(
        newEntries.map((entry) => ({
          id: entry.id,
          userId,
          date: entry.date,
          amount: entry.amount,
          source: entry.source,
          label: entry.label,
        })),
      );
    }

    for (const itemId of bundle.newOwnedItemIds) {
      await tx.insert(ownedShopItems).values({ userId, itemId });
    }

    if (bundle.streakFreezes !== undefined) {
      await tx
        .update(rewardSystems)
        .set({ streakFreezes: bundle.streakFreezes })
        .where(eq(rewardSystems.userId, userId));
    }

    if (bundle.challenge) {
      await tx
        .update(userChallenges)
        .set({ claimed: bundle.challenge.claimed })
        .where(
          and(
            eq(userChallenges.userId, userId),
            eq(userChallenges.challengeKey, bundle.challenge.challengeKey),
            eq(userChallenges.startsAt, bundle.challenge.startsAt),
          ),
        );
    }

    if (bundle.quest) {
      await tx
        .update(userQuestArcs)
        .set({ claimed: bundle.quest.claimed })
        .where(
          and(
            eq(userQuestArcs.userId, userId),
            eq(userQuestArcs.questKey, bundle.quest.questKey),
          ),
        );
    }

    if (bundle.seasonClaimedLevels) {
      await tx
        .update(seasonPasses)
        .set({ claimedLevels: bundle.seasonClaimedLevels })
        .where(eq(seasonPasses.userId, userId));
    }

    if (bundle.bossRewardClaimed !== undefined) {
      await tx
        .update(weeklyBosses)
        .set({ rewardClaimed: bundle.bossRewardClaimed })
        .where(eq(weeklyBosses.userId, userId));
    }

    await touchSaveMeta(tx, userId, updatedAt);
    return { updatedAt, version: SAVE_VERSION };
  });
}

export async function maybeMigrateLegacyBlob(
  database: Database,
  userId: string,
  catalog?: HabitQuestCatalog,
): Promise<{ data: HabitQuestData; updatedAt: string; version: number } | null> {
  if (await userHasNormalizedSave(database, userId)) {
    return loadNormalizedSave(database, userId, catalog);
  }

  const blobRows = await database
    .select()
    .from(habitquestSaves)
    .where(eq(habitquestSaves.userId, userId))
    .limit(1);
  const blob = blobRows[0];
  if (!blob) {
    return null;
  }

  try {
    const parsed = JSON.parse(blob.payload) as Partial<HabitQuestData>;
    const resolvedCatalog = catalog ?? (await loadCatalogFromDb(database));
    const data = normalizeHabitQuestData(parsed, resolvedCatalog);
    const saved = await replaceNormalizedSave(database, userId, data);
    return saved;
  } catch {
    return null;
  }
}
