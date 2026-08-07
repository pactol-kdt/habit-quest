import "server-only";

import { eq } from "drizzle-orm";
import { getBuiltinCatalog, type HabitQuestCatalog } from "~/lib/habitquest/catalog";
import { UNLOCK_LABELS } from "~/lib/habitquest/constants";
import {
  createId,
  getEndOfCurrentMonthKey,
  getEndOfCurrentWeekKey,
  getStartOfCurrentMonthKey,
  getStartOfCurrentWeekKey,
} from "~/lib/habitquest/utils";
import { db } from "~/lib/db";
import {
  catalogAchievements,
  catalogChallenges,
  catalogLevelUnlocks,
  catalogQuestArcs,
  catalogSeasonRewards,
  catalogShopItems,
} from "~/lib/db/schema";
import type {
  Achievement,
  Challenge,
  LevelUnlock,
  QuestArc,
  SeasonPassReward,
  ShopItem,
  UnlockFeature,
} from "~/types/habitquest";

type Database = typeof db;

export async function ensureCatalogSeeded(database: Database = db) {
  const existing = await database
    .select({ id: catalogShopItems.id })
    .from(catalogShopItems)
    .limit(1);

  if (!existing[0]) {
    const catalog = getBuiltinCatalog();
    await replaceCatalog(database, catalog);
    return;
  }

  // Party codes were removed — drop leftover catalog unlock rows.
  await database
    .delete(catalogLevelUnlocks)
    .where(eq(catalogLevelUnlocks.feature, "party"));

  await syncMissingBuiltinCatalogRows(database);
}

/** Backfill challenges / unlocks / titles stripped from older builtin catalogs. */
async function syncMissingBuiltinCatalogRows(database: Database) {
  const builtin = getBuiltinCatalog();

  const challengeRows = await database.select({ key: catalogChallenges.key }).from(catalogChallenges);
  const existingChallengeKeys = new Set(challengeRows.map((row) => row.key));
  const missingChallenges = builtin.challenges.filter(
    (challenge) => !existingChallengeKeys.has(challenge.key),
  );
  if (missingChallenges.length) {
    await database.insert(catalogChallenges).values(
      missingChallenges.map((challenge, index) => ({
        key: challenge.key,
        title: challenge.title,
        description: challenge.description,
        period: challenge.period,
        type: challenge.type,
        target: challenge.target,
        rewardCoins: challenge.reward.coins,
        rewardExp: challenge.reward.exp,
        rewardTitleItemId: challenge.reward.titleItemId,
        sortOrder: challengeRows.length + index,
        active: true,
      })),
    );
  }

  const unlockRows = await database
    .select({ feature: catalogLevelUnlocks.feature })
    .from(catalogLevelUnlocks);
  const existingUnlocks = new Set(unlockRows.map((row) => row.feature));
  const missingUnlocks = builtin.levelUnlocks.filter(
    (unlock) => !existingUnlocks.has(unlock.feature),
  );
  if (missingUnlocks.length) {
    await database.insert(catalogLevelUnlocks).values(
      missingUnlocks.map((unlock, index) => ({
        feature: unlock.feature,
        id: unlock.id,
        label: unlock.label,
        description: unlock.description,
        requiredLevel: unlock.requiredLevel,
        sortOrder: unlockRows.length + index,
        active: true,
      })),
    );
  }

  const achievementRows = await database
    .select({ key: catalogAchievements.key })
    .from(catalogAchievements);
  const existingAchievements = new Set(achievementRows.map((row) => row.key));
  const missingAchievements = builtin.achievements.filter(
    (achievement) => !existingAchievements.has(achievement.key),
  );
  if (missingAchievements.length) {
    await database.insert(catalogAchievements).values(
      missingAchievements.map((achievement, index) => ({
        key: achievement.key,
        id: achievement.id,
        title: achievement.title,
        description: achievement.description,
        category: achievement.category,
        icon: achievement.icon,
        rewardCoins: achievement.reward.coins,
        rewardExp: achievement.reward.exp,
        sortOrder: achievementRows.length + index,
        active: true,
      })),
    );
  }

  const shopRows = await database.select({ id: catalogShopItems.id }).from(catalogShopItems);
  const existingShopIds = new Set(shopRows.map((row) => row.id));
  const missingShop = builtin.shopItems.filter((item) => !existingShopIds.has(item.id));
  if (missingShop.length) {
    await database.insert(catalogShopItems).values(
      missingShop.map((item, index) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        rarity: item.rarity,
        price: item.price,
        requiredLevel: item.requiredLevel,
        requiredFeature: item.requiredFeature,
        preview: item.preview,
        exclusive: item.exclusive,
        themeVars: item.themeVars ?? null,
        sortOrder: shopRows.length + index,
        active: true,
      })),
    );
  }

  // Keep theme palettes in sync with builtin catalog (visual tokens evolve over time).
  for (const item of builtin.shopItems) {
    if (item.category !== "theme" || !item.themeVars || !existingShopIds.has(item.id)) {
      continue;
    }
    await database
      .update(catalogShopItems)
      .set({ themeVars: item.themeVars })
      .where(eq(catalogShopItems.id, item.id));
  }
}

export async function replaceCatalog(database: Database, catalog: HabitQuestCatalog) {
  await database.delete(catalogShopItems);
  await database.delete(catalogAchievements);
  await database.delete(catalogChallenges);
  await database.delete(catalogLevelUnlocks);
  await database.delete(catalogQuestArcs);
  await database.delete(catalogSeasonRewards);

  if (catalog.shopItems.length) {
    await database.insert(catalogShopItems).values(
      catalog.shopItems.map((item, index) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        rarity: item.rarity,
        price: item.price,
        requiredLevel: item.requiredLevel,
        requiredFeature: item.requiredFeature,
        preview: item.preview,
        exclusive: item.exclusive,
        themeVars: item.themeVars ?? null,
        sortOrder: index,
        active: true,
      })),
    );
  }

  if (catalog.achievements.length) {
    await database.insert(catalogAchievements).values(
      catalog.achievements.map((achievement, index) => ({
        key: achievement.key,
        id: achievement.id,
        title: achievement.title,
        description: achievement.description,
        category: achievement.category,
        icon: achievement.icon,
        rewardCoins: achievement.reward.coins,
        rewardExp: achievement.reward.exp,
        sortOrder: index,
        active: true,
      })),
    );
  }

  if (catalog.challenges.length) {
    await database.insert(catalogChallenges).values(
      catalog.challenges.map((challenge, index) => ({
        key: challenge.key,
        title: challenge.title,
        description: challenge.description,
        period: challenge.period,
        type: challenge.type,
        target: challenge.target,
        rewardCoins: challenge.reward.coins,
        rewardExp: challenge.reward.exp,
        rewardTitleItemId: challenge.reward.titleItemId,
        sortOrder: index,
        active: true,
      })),
    );
  }

  if (catalog.levelUnlocks.length) {
    await database.insert(catalogLevelUnlocks).values(
      catalog.levelUnlocks.map((unlock, index) => ({
        feature: unlock.feature,
        id: unlock.id,
        label: unlock.label,
        description: unlock.description,
        requiredLevel: unlock.requiredLevel,
        sortOrder: index,
        active: true,
      })),
    );
  }

  if (catalog.questArcs.length) {
    await database.insert(catalogQuestArcs).values(
      catalog.questArcs.map((arc, index) => ({
        key: arc.key,
        id: arc.id,
        chapter: arc.chapter,
        title: arc.title,
        description: arc.description,
        objectiveType: arc.objectiveType,
        target: arc.target,
        rewardCoins: arc.reward.coins,
        rewardExp: arc.reward.exp,
        unlockThemeId: arc.reward.unlockThemeId,
        sortOrder: index,
        active: true,
      })),
    );
  }

  if (catalog.seasonRewards.length) {
    await database.insert(catalogSeasonRewards).values(
      catalog.seasonRewards.map((reward) => ({
        level: reward.level,
        coins: reward.coins,
        exp: reward.exp,
        label: reward.label,
        active: true,
      })),
    );
  }
}

export async function loadCatalogFromDb(
  database: Database = db,
): Promise<HabitQuestCatalog> {
  await ensureCatalogSeeded(database);

  const [shopRows, achievementRows, challengeRows, unlockRows, questRows, seasonRows] =
    await Promise.all([
      database.select().from(catalogShopItems),
      database.select().from(catalogAchievements),
      database.select().from(catalogChallenges),
      database.select().from(catalogLevelUnlocks),
      database.select().from(catalogQuestArcs),
      database.select().from(catalogSeasonRewards),
    ]);

  if (!shopRows.length) {
    return getBuiltinCatalog();
  }

  const shopItems: ShopItem[] = shopRows
    .filter((row) => row.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category as ShopItem["category"],
      rarity: row.rarity as ShopItem["rarity"],
      price: row.price,
      requiredLevel: row.requiredLevel,
      requiredFeature: (row.requiredFeature as ShopItem["requiredFeature"]) ?? null,
      preview: row.preview,
      exclusive: row.exclusive,
      owned: false,
      themeVars: row.themeVars ?? undefined,
    }));

  const achievements: Achievement[] = achievementRows
    .filter((row) => row.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => ({
      id: row.id,
      key: row.key,
      title: row.title,
      description: row.description,
      category: row.category as Achievement["category"],
      icon: row.icon,
      unlocked: false,
      unlockedAt: null,
      rewardedAt: null,
      reward: { coins: row.rewardCoins, exp: row.rewardExp },
    }));

  const challenges: Challenge[] = challengeRows
    .filter((row) => row.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => {
      const isWeekly = row.period === "weekly";
      return {
        id: createId("challenge"),
        key: row.key,
        title: row.title,
        description: row.description,
        period: row.period as Challenge["period"],
        type: row.type as Challenge["type"],
        target: row.target,
        progress: 0,
        completed: false,
        claimed: false,
        startsAt: isWeekly ? getStartOfCurrentWeekKey() : getStartOfCurrentMonthKey(),
        endsAt: isWeekly ? getEndOfCurrentWeekKey() : getEndOfCurrentMonthKey(),
        reward: {
          coins: row.rewardCoins,
          exp: row.rewardExp,
          titleItemId: row.rewardTitleItemId,
        },
      };
    });

  const levelUnlocks: LevelUnlock[] = unlockRows
    .filter((row) => row.active && row.feature in UNLOCK_LABELS)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => ({
      id: row.id,
      feature: row.feature as UnlockFeature,
      label: row.label,
      description: row.description,
      requiredLevel: row.requiredLevel,
      unlocked: false,
      unlockedAt: null,
    }));

  const questArcs: QuestArc[] = questRows
    .filter((row) => row.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => ({
      id: row.id,
      key: row.key,
      chapter: row.chapter,
      title: row.title,
      description: row.description,
      objectiveType: row.objectiveType as QuestArc["objectiveType"],
      target: row.target,
      progress: 0,
      completed: false,
      claimed: false,
      reward: {
        coins: row.rewardCoins,
        exp: row.rewardExp,
        unlockThemeId: row.unlockThemeId,
      },
    }));

  const seasonRewards: SeasonPassReward[] = seasonRows
    .filter((row) => row.active)
    .sort((a, b) => a.level - b.level)
    .map((row) => ({
      level: row.level,
      coins: row.coins,
      exp: row.exp,
      label: row.label,
    }));

  return {
    shopItems,
    achievements,
    challenges,
    levelUnlocks,
    questArcs,
    seasonRewards,
  };
}

export async function upsertCatalogShopItem(
  database: Database,
  item: Omit<ShopItem, "owned"> & { active?: boolean },
) {
  const existing = await database
    .select({ id: catalogShopItems.id })
    .from(catalogShopItems)
    .where(eq(catalogShopItems.id, item.id))
    .limit(1);

  const values = {
    id: item.id,
    name: item.name,
    description: item.description,
    category: item.category,
    rarity: item.rarity,
    price: item.price,
    requiredLevel: item.requiredLevel,
    requiredFeature: item.requiredFeature,
    preview: item.preview,
    exclusive: item.exclusive,
    themeVars: item.themeVars ?? null,
    sortOrder: 0,
    active: item.active ?? true,
  };

  if (existing[0]) {
    await database
      .update(catalogShopItems)
      .set(values)
      .where(eq(catalogShopItems.id, item.id));
  } else {
    await database.insert(catalogShopItems).values(values);
  }
}

export async function upsertCatalogAchievement(
  database: Database,
  achievement: Omit<Achievement, "unlocked" | "unlockedAt" | "rewardedAt"> & {
    active?: boolean;
  },
) {
  const existing = await database
    .select()
    .from(catalogAchievements)
    .where(eq(catalogAchievements.key, achievement.key))
    .limit(1);

  const values = {
    key: achievement.key,
    id: existing[0]?.id ?? achievement.id,
    title: achievement.title,
    description: achievement.description,
    category: achievement.category,
    icon: achievement.icon,
    rewardCoins: achievement.reward.coins,
    rewardExp: achievement.reward.exp,
    sortOrder: existing[0]?.sortOrder ?? 0,
    active: achievement.active ?? true,
  };

  if (existing[0]) {
    await database
      .update(catalogAchievements)
      .set(values)
      .where(eq(catalogAchievements.key, achievement.key));
  } else {
    await database.insert(catalogAchievements).values(values);
  }
}
