import "server-only";

import { and, eq } from "drizzle-orm";
import { SAVE_VERSION, UNLOCK_LABELS } from "~/lib/habitquest/constants";
import { DEFAULT_REMINDER_LOCAL_TIME } from "@habitquest/shared";
import type { HabitQuestCatalog } from "~/lib/habitquest/catalog";
import { mergeCompletionsForFullSave } from "~/lib/habitquest/save-integrity";
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
import type { GamePatch } from "~/lib/habitquest/game-patch";
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
        stackAfter: row.stackAfter ?? "",
        stackAfterHabitId: row.stackAfterHabitId ?? null,
        cueTime: row.cueTime ?? null,
        cueContext: row.cueContext ?? "",
        identityWhy: row.identityWhy ?? "",
        desiredFeeling: row.desiredFeeling ?? "",
        tinyVersion: row.tinyVersion ?? "",
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
          reminderTime: DEFAULT_REMINDER_LOCAL_TIME,
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
          seasonPassCompletions: rewardRows[0].seasonPassCompletions ?? 0,
          weeklyBossCompletions: rewardRows[0].weeklyBossCompletions ?? 0,
          lastCountedBossWeekKey: rewardRows[0].lastCountedBossWeekKey ?? null,
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
  const incoming = normalizeHabitQuestData(data);

  // Habit membership is owned by surgical create/update/delete APIs.
  // Full saves must not delete-all + reinsert — stale client snapshots were
  // resurrecting habits after successful deletes (e.g. complete → bump payload).
  const existingHabitRows = await database
    .select({ id: habits.id })
    .from(habits)
    .where(eq(habits.userId, userId));
  const existingHabitIds = new Set(existingHabitRows.map((row) => row.id));
  const existingMeta = await database
    .select({ userId: saveMeta.userId })
    .from(saveMeta)
    .where(eq(saveMeta.userId, userId))
    .limit(1);
  const isInitialCloudSeed = existingHabitIds.size === 0 && existingMeta.length === 0;

  const existingCompletionRows = isInitialCloudSeed
    ? []
    : await database.select().from(habitCompletions).where(eq(habitCompletions.userId, userId));
  // Completions are owned like habits: a stale full-save must not drop days
  // the cloud already has (that was wiping streaks by 10+ days).
  const normalized = {
    ...incoming,
    completions: mergeCompletionsForFullSave(
      existingCompletionRows.map((row) => ({
        id: row.id,
        habitId: row.habitId,
        date: row.date,
        expEarned: row.expEarned,
        streakBonusExp: row.streakBonusExp,
        completedAt: row.completedAt,
        crit: row.crit || undefined,
      })),
      incoming.completions,
    ),
  };

  await database.transaction(async (tx) => {
  await tx.delete(habitCompletions).where(eq(habitCompletions.userId, userId));
  await tx.delete(expHistory).where(eq(expHistory.userId, userId));
  await tx.delete(ownedShopItems).where(eq(ownedShopItems.userId, userId));
  await tx.delete(userAchievements).where(eq(userAchievements.userId, userId));
  await tx.delete(userChallenges).where(eq(userChallenges.userId, userId));
  await tx.delete(userLevelUnlocks).where(eq(userLevelUnlocks.userId, userId));
  await tx.delete(userQuestArcs).where(eq(userQuestArcs.userId, userId));
  await tx.delete(wallets).where(eq(wallets.userId, userId));
  await tx.delete(userProgress).where(eq(userProgress.userId, userId));
  await tx.delete(dailyRewards).where(eq(dailyRewards.userId, userId));
  await tx.delete(userSettings).where(eq(userSettings.userId, userId));
  await tx.delete(equippedCosmetics).where(eq(equippedCosmetics.userId, userId));
  await tx.delete(rewardSystems).where(eq(rewardSystems.userId, userId));
  await tx.delete(seasonPasses).where(eq(seasonPasses.userId, userId));
  await tx.delete(weeklyBosses).where(eq(weeklyBosses.userId, userId));
  await tx.delete(saveMeta).where(eq(saveMeta.userId, userId));

  if (isInitialCloudSeed) {
    // First cloud save / legacy migration — seed habit rows once.
    if (normalized.habits.length) {
      await tx.insert(habits).values(
        normalized.habits.map((habit) => ({
          id: habit.id,
          userId,
          title: habit.title,
          description: habit.description,
          difficulty: habit.difficulty,
          recurrence: habit.recurrence,
          customDays: habit.customDays,
          stackAfter: habit.stackAfter,
          stackAfterHabitId: habit.stackAfterHabitId,
          cueTime: habit.cueTime,
          cueContext: habit.cueContext,
          identityWhy: habit.identityWhy,
          desiredFeeling: habit.desiredFeeling,
          tinyVersion: habit.tinyVersion,
          createdAt: habit.createdAt,
          updatedAt: habit.updatedAt,
        })),
      );
    }
  } else {
    for (const habit of normalized.habits) {
      if (!existingHabitIds.has(habit.id)) {
        // Skip — deleted surgically, or not created via habit API yet.
        continue;
      }
      await database
        .update(habits)
        .set({
          title: habit.title,
          description: habit.description,
          difficulty: habit.difficulty,
          recurrence: habit.recurrence,
          customDays: habit.customDays,
          stackAfter: habit.stackAfter,
          stackAfterHabitId: habit.stackAfterHabitId,
          cueTime: habit.cueTime,
          cueContext: habit.cueContext,
          identityWhy: habit.identityWhy,
          desiredFeeling: habit.desiredFeeling,
          tinyVersion: habit.tinyVersion,
          updatedAt: habit.updatedAt,
        })
        .where(and(eq(habits.userId, userId), eq(habits.id, habit.id)));
    }
  }

  if (normalized.completions.length) {
    await tx.insert(habitCompletions).values(
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
    await tx.insert(expHistory).values(
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

  await tx.insert(wallets).values({
    userId,
    totalCoins: normalized.wallet.totalCoins,
    lifetimeCoinsEarned: normalized.wallet.lifetimeCoinsEarned,
    lifetimeCoinsSpent: normalized.wallet.lifetimeCoinsSpent,
  });

  await tx.insert(userProgress).values({
    userId,
    totalExp: normalized.userProgress.totalExp,
    level: normalized.userProgress.level,
    currentStreak: normalized.userProgress.currentStreak,
    bestStreak: normalized.userProgress.bestStreak,
    totalCompletedHabits: normalized.userProgress.totalCompletedHabits,
    lastCompletedDate: normalized.userProgress.lastCompletedDate,
  });

  await tx.insert(dailyRewards).values({
    userId,
    lastLoginDate: normalized.dailyRewards.lastLoginDate,
    claimedDailyLoginDate: normalized.dailyRewards.claimedDailyLoginDate,
    claimedDailyCompletionRewardDate: normalized.dailyRewards.claimedDailyCompletionRewardDate,
  });

  await tx.insert(userSettings).values({
    userId,
    displayName: normalized.settings.displayName,
    onboardingCompleted: normalized.settings.onboardingCompleted,
    remindersEnabled: normalized.settings.remindersEnabled,
    reminderTime: normalized.settings.reminderTime,
  });

  await tx.insert(equippedCosmetics).values({
    userId,
    titleItemId: normalized.equippedItems.titleItemId,
    frameItemId: normalized.equippedItems.frameItemId,
    avatarItemId: normalized.equippedItems.avatarItemId,
    themeItemId: normalized.equippedItems.themeItemId,
  });

  const owned = normalized.shopItems.filter((item) => item.owned);
  if (owned.length) {
    await tx.insert(ownedShopItems).values(
      owned.map((item) => ({
        userId,
        itemId: item.id,
      })),
    );
  }

  if (normalized.achievements.length) {
    await tx.insert(userAchievements).values(
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
    await tx.insert(userChallenges).values(
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
    await tx.insert(userLevelUnlocks).values(
      normalized.levelUnlocks.map((unlock) => ({
        userId,
        feature: unlock.feature,
        unlocked: unlock.unlocked,
        unlockedAt: unlock.unlockedAt,
      })),
    );
  }

  await tx.insert(rewardSystems).values({
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
    seasonPassCompletions: normalized.rewardSystems.seasonPassCompletions,
    weeklyBossCompletions: normalized.rewardSystems.weeklyBossCompletions,
    lastCountedBossWeekKey: normalized.rewardSystems.lastCountedBossWeekKey,
  });

  if (normalized.questArcs.length) {
    await tx.insert(userQuestArcs).values(
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

  await tx.insert(seasonPasses).values({
    userId,
    seasonKey: normalized.seasonPass.seasonKey,
    xp: normalized.seasonPass.xp,
    level: normalized.seasonPass.level,
    claimedLevels: normalized.seasonPass.claimedLevels,
  });

  await tx.insert(weeklyBosses).values({
    userId,
    weekKey: normalized.weeklyBoss.weekKey,
    name: normalized.weeklyBoss.name,
    maxHp: normalized.weeklyBoss.maxHp,
    currentHp: normalized.weeklyBoss.currentHp,
    defeated: normalized.weeklyBoss.defeated,
    rewardClaimed: normalized.weeklyBoss.rewardClaimed,
    settledThroughDate: normalized.weeklyBoss.settledThroughDate,
  });

  await tx.insert(saveMeta).values({
    userId,
    version: SAVE_VERSION,
    updatedAt,
  });

  // Drop legacy blob once rows are authoritative.
  await tx.delete(habitquestSaves).where(eq(habitquestSaves.userId, userId));

  });

  return { updatedAt, version: SAVE_VERSION, data: normalized };
}

/** Surgical write for a single day's clear — transactional + combo recount. */
export async function persistTodayHabitCompletion(
  database: Database,
  userId: string,
  completion: HabitCompletion,
) {
  return persistTodayHabitCompletions(database, userId, [completion]);
}

/** Surgical write for many same-day clears — one transaction + one combo recount. */
export async function persistTodayHabitCompletions(
  database: Database,
  userId: string,
  completions: HabitCompletion[],
) {
  if (!completions.length) {
    throw new Error("No completions to persist.");
  }

  const updatedAt = new Date().toISOString();
  const date = completions[0]!.date;

  return database.transaction(async (tx) => {
    await tx.insert(habitCompletions).values(
      completions.map((completion) => ({
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
      stackAfter: habit.stackAfter,
      stackAfterHabitId: habit.stackAfterHabitId,
      cueTime: habit.cueTime,
      cueContext: habit.cueContext,
      identityWhy: habit.identityWhy,
      desiredFeeling: habit.desiredFeeling,
      tinyVersion: habit.tinyVersion,
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
        stackAfter: habit.stackAfter,
        stackAfterHabitId: habit.stackAfterHabitId,
        cueTime: habit.cueTime,
        cueContext: habit.cueContext,
        identityWhy: habit.identityWhy,
        desiredFeeling: habit.desiredFeeling,
        tinyVersion: habit.tinyVersion,
        updatedAt: habit.updatedAt,
      })
      .where(and(eq(habits.userId, userId), eq(habits.id, habit.id)));
    await touchSaveMeta(tx, userId, updatedAt);
    return { updatedAt, version: SAVE_VERSION, habit };
  });
}

/** Surgical habit delete. Completion history stays so streaks don't rewind. */
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
  // Completions stay so unique streak dates survive deleting a habit.
  return database.transaction(async (tx) => {
    await tx
      .update(habits)
      .set({ stackAfterHabitId: null })
      .where(
        and(eq(habits.userId, userId), eq(habits.stackAfterHabitId, habitId)),
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
        reminderTime: DEFAULT_REMINDER_LOCAL_TIME,
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
  seasonPassCompletions?: number;
  weeklyBossCompletions?: number;
  lastCountedBossWeekKey?: string | null;
  challenge?: { challengeKey: string; startsAt: string; claimed: boolean };
  challenges?: Array<{ challengeKey: string; startsAt: string; claimed: boolean }>;
  quest?: { questKey: string; claimed: boolean };
  quests?: Array<{ questKey: string; claimed: boolean }>;
  seasonClaimedLevels?: number[];
  seasonKey?: string;
  seasonXp?: number;
  seasonLevel?: number;
  progressSettledThroughDate?: string | null;
  levelUnlocks?: Array<{ feature: string; unlockedAt: string | null }>;
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

    if (bundle.seasonPassCompletions !== undefined) {
      await tx
        .update(rewardSystems)
        .set({ seasonPassCompletions: bundle.seasonPassCompletions })
        .where(eq(rewardSystems.userId, userId));
    }

    if (
      bundle.weeklyBossCompletions !== undefined ||
      bundle.lastCountedBossWeekKey !== undefined
    ) {
      await tx
        .update(rewardSystems)
        .set({
          ...(bundle.weeklyBossCompletions !== undefined
            ? { weeklyBossCompletions: bundle.weeklyBossCompletions }
            : {}),
          ...(bundle.lastCountedBossWeekKey !== undefined
            ? { lastCountedBossWeekKey: bundle.lastCountedBossWeekKey }
            : {}),
        })
        .where(eq(rewardSystems.userId, userId));
    }

    const challengeUpdates = [
      ...(bundle.challenge ? [bundle.challenge] : []),
      ...(bundle.challenges ?? []),
    ];
    for (const challenge of challengeUpdates) {
      await tx
        .update(userChallenges)
        .set({ claimed: challenge.claimed })
        .where(
          and(
            eq(userChallenges.userId, userId),
            eq(userChallenges.challengeKey, challenge.challengeKey),
            eq(userChallenges.startsAt, challenge.startsAt),
          ),
        );
    }

    const questUpdates = [
      ...(bundle.quest ? [bundle.quest] : []),
      ...(bundle.quests ?? []),
    ];
    for (const quest of questUpdates) {
      await tx
        .update(userQuestArcs)
        .set({ claimed: quest.claimed })
        .where(
          and(
            eq(userQuestArcs.userId, userId),
            eq(userQuestArcs.questKey, quest.questKey),
          ),
        );
    }

    if (
      bundle.seasonClaimedLevels ||
      bundle.seasonXp !== undefined ||
      bundle.seasonLevel !== undefined ||
      bundle.seasonKey
    ) {
      await tx
        .update(seasonPasses)
        .set({
          ...(bundle.seasonClaimedLevels ? { claimedLevels: bundle.seasonClaimedLevels } : {}),
          ...(bundle.seasonXp !== undefined ? { xp: bundle.seasonXp } : {}),
          ...(bundle.seasonLevel !== undefined ? { level: bundle.seasonLevel } : {}),
          ...(bundle.seasonKey ? { seasonKey: bundle.seasonKey } : {}),
        })
        .where(eq(seasonPasses.userId, userId));
    }

    if (bundle.progressSettledThroughDate !== undefined) {
      await tx
        .update(rewardSystems)
        .set({ progressSettledThroughDate: bundle.progressSettledThroughDate })
        .where(eq(rewardSystems.userId, userId));
    }

    if (bundle.levelUnlocks?.length) {
      for (const unlock of bundle.levelUnlocks) {
        await tx
          .insert(userLevelUnlocks)
          .values({
            userId,
            feature: unlock.feature,
            unlocked: true,
            unlockedAt: unlock.unlockedAt,
          })
          .onConflictDoUpdate({
            target: [userLevelUnlocks.userId, userLevelUnlocks.feature],
            set: {
              unlocked: true,
              unlockedAt: unlock.unlockedAt,
            },
          });
      }
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

/**
 * Persist only the dirty slices from a GamePatch (complete / undo / settle / etc.).
 * Does not call replaceNormalizedSave.
 */
export async function persistGamePatch(
  database: Database,
  userId: string,
  patch: GamePatch,
) {
  const updatedAt = new Date().toISOString();

  return database.transaction(async (tx) => {
    if (patch.completions?.length) {
      await tx.insert(habitCompletions).values(
        patch.completions.map((completion) => ({
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

    if (patch.removedCompletions?.length) {
      for (const entry of patch.removedCompletions) {
        await tx
          .delete(habitCompletions)
          .where(
            and(
              eq(habitCompletions.userId, userId),
              eq(habitCompletions.habitId, entry.habitId),
              eq(habitCompletions.date, entry.date),
            ),
          );
      }
    }

    if (patch.wallet) {
      await writeWallet(tx, userId, patch.wallet);
    }

    if (patch.userProgress) {
      await writeUserProgress(tx, userId, patch.userProgress);
    }

    if (patch.expHistory?.length) {
      await tx.insert(expHistory).values(
        patch.expHistory.map((entry) => ({
          id: entry.id,
          userId,
          date: entry.date,
          amount: entry.amount,
          source: entry.source,
          label: entry.label,
        })),
      );
    }

    if (patch.removedExpHistoryIds?.length) {
      for (const id of patch.removedExpHistoryIds) {
        await tx
          .delete(expHistory)
          .where(and(eq(expHistory.userId, userId), eq(expHistory.id, id)));
      }
    }

    if (patch.rewardSystems) {
      const rs = patch.rewardSystems;
      await tx
        .update(rewardSystems)
        .set({
          streakFreezes: rs.streakFreezes,
          streakShieldDates: rs.streakShieldDates,
          lastFreezeUsedDate: rs.lastFreezeUsedDate,
          lastComebackDate: rs.lastComebackDate,
          todayCombo: rs.todayCombo,
          comboDate: rs.comboDate,
          progressSettledThroughDate: rs.progressSettledThroughDate,
          seasonPassCompletions: rs.seasonPassCompletions,
          weeklyBossCompletions: rs.weeklyBossCompletions,
          lastCountedBossWeekKey: rs.lastCountedBossWeekKey,
        })
        .where(eq(rewardSystems.userId, userId));
    }

    if (patch.dailyRewards) {
      await tx
        .update(dailyRewards)
        .set({
          lastLoginDate: patch.dailyRewards.lastLoginDate,
          claimedDailyLoginDate: patch.dailyRewards.claimedDailyLoginDate,
          claimedDailyCompletionRewardDate:
            patch.dailyRewards.claimedDailyCompletionRewardDate,
        })
        .where(eq(dailyRewards.userId, userId));
    }

    if (patch.achievements?.length) {
      for (const achievement of patch.achievements) {
        await tx
          .insert(userAchievements)
          .values({
            userId,
            achievementKey: achievement.key,
            unlocked: achievement.unlocked,
            unlockedAt: achievement.unlockedAt,
            rewardedAt: achievement.rewardedAt,
          })
          .onConflictDoUpdate({
            target: [userAchievements.userId, userAchievements.achievementKey],
            set: {
              unlocked: achievement.unlocked,
              unlockedAt: achievement.unlockedAt,
              rewardedAt: achievement.rewardedAt,
            },
          });
      }
    }

    if (patch.challenges?.length) {
      for (const challenge of patch.challenges) {
        await tx
          .insert(userChallenges)
          .values({
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
          })
          .onConflictDoUpdate({
            target: [
              userChallenges.userId,
              userChallenges.challengeKey,
              userChallenges.startsAt,
            ],
            set: {
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
            },
          });
      }
    }

    if (patch.questArcs?.length) {
      for (const arc of patch.questArcs) {
        await tx
          .update(userQuestArcs)
          .set({
            progress: arc.progress,
            completed: arc.completed,
            claimed: arc.claimed,
          })
          .where(
            and(eq(userQuestArcs.userId, userId), eq(userQuestArcs.questKey, arc.key)),
          );
      }
    }

    if (patch.seasonPass) {
      await tx
        .update(seasonPasses)
        .set({
          seasonKey: patch.seasonPass.seasonKey,
          xp: patch.seasonPass.xp,
          level: patch.seasonPass.level,
          claimedLevels: patch.seasonPass.claimedLevels,
        })
        .where(eq(seasonPasses.userId, userId));
    }

    if (patch.weeklyBoss) {
      await tx
        .update(weeklyBosses)
        .set({
          weekKey: patch.weeklyBoss.weekKey,
          name: patch.weeklyBoss.name,
          maxHp: patch.weeklyBoss.maxHp,
          currentHp: patch.weeklyBoss.currentHp,
          defeated: patch.weeklyBoss.defeated,
          rewardClaimed: patch.weeklyBoss.rewardClaimed,
          settledThroughDate: patch.weeklyBoss.settledThroughDate,
        })
        .where(eq(weeklyBosses.userId, userId));
    }

    if (patch.levelUnlocks?.length) {
      for (const unlock of patch.levelUnlocks) {
        await tx
          .insert(userLevelUnlocks)
          .values({
            userId,
            feature: unlock.feature,
            unlocked: unlock.unlocked,
            unlockedAt: unlock.unlockedAt,
          })
          .onConflictDoUpdate({
            target: [userLevelUnlocks.userId, userLevelUnlocks.feature],
            set: {
              unlocked: unlock.unlocked,
              unlockedAt: unlock.unlockedAt,
            },
          });
      }
    }

    if (patch.shopOwnedIds?.length) {
      for (const itemId of patch.shopOwnedIds) {
        await tx
          .insert(ownedShopItems)
          .values({ userId, itemId })
          .onConflictDoNothing();
      }
    } else if (patch.shopItems?.length) {
      for (const item of patch.shopItems.filter((entry) => entry.owned)) {
        await tx
          .insert(ownedShopItems)
          .values({ userId, itemId: item.id })
          .onConflictDoNothing();
      }
    }

    if (patch.equippedItems) {
      await tx
        .update(equippedCosmetics)
        .set({
          titleItemId: patch.equippedItems.titleItemId,
          frameItemId: patch.equippedItems.frameItemId,
          avatarItemId: patch.equippedItems.avatarItemId,
          themeItemId: patch.equippedItems.themeItemId,
        })
        .where(eq(equippedCosmetics.userId, userId));
    }

    if (patch.settings) {
      await tx
        .update(userSettings)
        .set({
          displayName: patch.settings.displayName,
          onboardingCompleted: patch.settings.onboardingCompleted,
          remindersEnabled: patch.settings.remindersEnabled,
          reminderTime: DEFAULT_REMINDER_LOCAL_TIME,
        })
        .where(eq(userSettings.userId, userId));
    }

    if (patch.habits?.length) {
      for (const habit of patch.habits) {
        await tx
          .update(habits)
          .set({
            title: habit.title,
            description: habit.description,
            difficulty: habit.difficulty,
            recurrence: habit.recurrence,
            customDays: habit.customDays,
            stackAfter: habit.stackAfter,
            stackAfterHabitId: habit.stackAfterHabitId,
            cueTime: habit.cueTime,
            cueContext: habit.cueContext,
            identityWhy: habit.identityWhy,
            desiredFeeling: habit.desiredFeeling,
            tinyVersion: habit.tinyVersion,
            updatedAt: habit.updatedAt,
          })
          .where(and(eq(habits.userId, userId), eq(habits.id, habit.id)));
      }
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
