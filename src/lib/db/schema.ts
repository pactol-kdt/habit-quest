import {
  boolean,
  int,
  json,
  mysqlTable,
  primaryKey,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 64 }).notNull().default(""),
  role: varchar("role", { length: 16 }).notNull().default("user"),
  createdAt: varchar("created_at", { length: 40 }).notNull(),
  updatedAt: varchar("updated_at", { length: 40 }).notNull(),
});

export const sessions = mysqlTable("sessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 128 }).notNull().unique(),
  expiresAt: varchar("expires_at", { length: 40 }).notNull(),
  createdAt: varchar("created_at", { length: 40 }).notNull(),
});

/** Presence / version marker for normalized saves. */
export const saveMeta = mysqlTable("save_meta", {
  userId: varchar("user_id", { length: 36 })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  version: int("version").notNull().default(3),
  updatedAt: varchar("updated_at", { length: 40 }).notNull(),
});

/** Legacy JSON blob — kept only for one-time migration into rows. */
export const habitquestSaves = mysqlTable("habitquest_saves", {
  userId: varchar("user_id", { length: 36 })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  version: int("version").notNull().default(3),
  payload: text("payload").notNull(),
  updatedAt: varchar("updated_at", { length: 40 }).notNull(),
});

export const habits = mysqlTable("habits", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description").notNull(),
  difficulty: varchar("difficulty", { length: 16 }).notNull(),
  recurrence: varchar("recurrence", { length: 16 }).notNull(),
  customDays: json("custom_days").$type<number[]>().notNull(),
  createdAt: varchar("created_at", { length: 40 }).notNull(),
  updatedAt: varchar("updated_at", { length: 40 }).notNull(),
});

export const habitCompletions = mysqlTable(
  "habit_completions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    habitId: varchar("habit_id", { length: 64 }).notNull(),
    date: varchar("date", { length: 10 }).notNull(),
    expEarned: int("exp_earned").notNull(),
    streakBonusExp: int("streak_bonus_exp").notNull().default(0),
    completedAt: varchar("completed_at", { length: 40 }).notNull(),
    crit: boolean("crit").notNull().default(false),
  },
  (table) => [
    uniqueIndex("uniq_completions_user_habit_date").on(
      table.userId,
      table.habitId,
      table.date,
    ),
  ],
);

export const expHistory = mysqlTable("exp_history", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: varchar("date", { length: 10 }).notNull(),
  amount: int("amount").notNull(),
  source: varchar("source", { length: 32 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
});

export const wallets = mysqlTable("wallets", {
  userId: varchar("user_id", { length: 36 })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  totalCoins: int("total_coins").notNull().default(0),
  lifetimeCoinsEarned: int("lifetime_coins_earned").notNull().default(0),
  lifetimeCoinsSpent: int("lifetime_coins_spent").notNull().default(0),
});

export const userProgress = mysqlTable("user_progress", {
  userId: varchar("user_id", { length: 36 })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  totalExp: int("total_exp").notNull().default(0),
  level: int("level").notNull().default(1),
  currentStreak: int("current_streak").notNull().default(0),
  bestStreak: int("best_streak").notNull().default(0),
  totalCompletedHabits: int("total_completed_habits").notNull().default(0),
  lastCompletedDate: varchar("last_completed_date", { length: 10 }),
});

export const dailyRewards = mysqlTable("daily_rewards", {
  userId: varchar("user_id", { length: 36 })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  lastLoginDate: varchar("last_login_date", { length: 10 }),
  claimedDailyLoginDate: varchar("claimed_daily_login_date", { length: 10 }),
  claimedDailyCompletionRewardDate: varchar("claimed_daily_completion_reward_date", {
    length: 10,
  }),
});

export const userSettings = mysqlTable("user_settings", {
  userId: varchar("user_id", { length: 36 })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  displayName: varchar("display_name", { length: 64 }).notNull().default(""),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  remindersEnabled: boolean("reminders_enabled").notNull().default(false),
  reminderTime: varchar("reminder_time", { length: 8 }).notNull().default("09:00"),
});

export const equippedCosmetics = mysqlTable("equipped_cosmetics", {
  userId: varchar("user_id", { length: 36 })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  titleItemId: varchar("title_item_id", { length: 64 }),
  frameItemId: varchar("frame_item_id", { length: 64 }),
  avatarItemId: varchar("avatar_item_id", { length: 64 }),
  themeItemId: varchar("theme_item_id", { length: 64 }),
});

export const ownedShopItems = mysqlTable(
  "owned_shop_items",
  {
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: varchar("item_id", { length: 64 }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.itemId] })],
);

export const userAchievements = mysqlTable(
  "user_achievements",
  {
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    achievementKey: varchar("achievement_key", { length: 64 }).notNull(),
    unlocked: boolean("unlocked").notNull().default(false),
    unlockedAt: varchar("unlocked_at", { length: 40 }),
    rewardedAt: varchar("rewarded_at", { length: 40 }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.achievementKey] })],
);

export const userChallenges = mysqlTable(
  "user_challenges",
  {
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    challengeKey: varchar("challenge_key", { length: 64 }).notNull(),
    startsAt: varchar("starts_at", { length: 10 }).notNull(),
    id: varchar("id", { length: 64 }).notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    description: text("description").notNull(),
    period: varchar("period", { length: 16 }).notNull(),
    type: varchar("type", { length: 32 }).notNull(),
    target: int("target").notNull(),
    progress: int("progress").notNull().default(0),
    completed: boolean("completed").notNull().default(false),
    claimed: boolean("claimed").notNull().default(false),
    endsAt: varchar("ends_at", { length: 10 }).notNull(),
    rewardCoins: int("reward_coins").notNull().default(0),
    rewardExp: int("reward_exp").notNull().default(0),
    rewardTitleItemId: varchar("reward_title_item_id", { length: 64 }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.challengeKey, table.startsAt] })],
);

export const userLevelUnlocks = mysqlTable(
  "user_level_unlocks",
  {
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    feature: varchar("feature", { length: 64 }).notNull(),
    unlocked: boolean("unlocked").notNull().default(false),
    unlockedAt: varchar("unlocked_at", { length: 40 }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.feature] })],
);

export const rewardSystems = mysqlTable("reward_systems", {
  userId: varchar("user_id", { length: 36 })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  streakFreezes: int("streak_freezes").notNull().default(1),
  streakShieldDates: json("streak_shield_dates").$type<string[]>().notNull(),
  lastFreezeUsedDate: varchar("last_freeze_used_date", { length: 40 }),
  lastComebackDate: varchar("last_comeback_date", { length: 10 }),
  todayCombo: int("today_combo").notNull().default(0),
  comboDate: varchar("combo_date", { length: 10 }),
  partyCode: varchar("party_code", { length: 16 }),
  partyWeeklyTarget: int("party_weekly_target").notNull().default(20),
  progressSettledThroughDate: varchar("progress_settled_through_date", { length: 10 }),
});

export const userQuestArcs = mysqlTable(
  "user_quest_arcs",
  {
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questKey: varchar("quest_key", { length: 64 }).notNull(),
    id: varchar("id", { length: 64 }).notNull(),
    progress: int("progress").notNull().default(0),
    completed: boolean("completed").notNull().default(false),
    claimed: boolean("claimed").notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.userId, table.questKey] })],
);

export const seasonPasses = mysqlTable("season_passes", {
  userId: varchar("user_id", { length: 36 })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  seasonKey: varchar("season_key", { length: 16 }).notNull(),
  xp: int("xp").notNull().default(0),
  level: int("level").notNull().default(1),
  claimedLevels: json("claimed_levels").$type<number[]>().notNull(),
});

export const weeklyBosses = mysqlTable("weekly_bosses", {
  userId: varchar("user_id", { length: 36 })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  weekKey: varchar("week_key", { length: 10 }).notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  maxHp: int("max_hp").notNull(),
  currentHp: int("current_hp").notNull(),
  defeated: boolean("defeated").notNull().default(false),
  rewardClaimed: boolean("reward_claimed").notNull().default(false),
  settledThroughDate: varchar("settled_through_date", { length: 10 }),
});

/** Global shop catalog (not per-user). */
export const catalogShopItems = mysqlTable("catalog_shop_items", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 16 }).notNull(),
  rarity: varchar("rarity", { length: 16 }).notNull(),
  price: int("price").notNull().default(0),
  requiredLevel: int("required_level").notNull().default(1),
  requiredFeature: varchar("required_feature", { length: 64 }),
  preview: varchar("preview", { length: 80 }).notNull(),
  exclusive: boolean("exclusive").notNull().default(false),
  themeVars: json("theme_vars").$type<Record<string, string> | null>(),
  sortOrder: int("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const catalogAchievements = mysqlTable("catalog_achievements", {
  key: varchar("achievement_key", { length: 64 }).primaryKey(),
  id: varchar("id", { length: 64 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 32 }).notNull(),
  icon: varchar("icon", { length: 40 }).notNull(),
  rewardCoins: int("reward_coins").notNull().default(0),
  rewardExp: int("reward_exp").notNull().default(0),
  sortOrder: int("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const catalogChallenges = mysqlTable("catalog_challenges", {
  key: varchar("challenge_key", { length: 64 }).primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description").notNull(),
  period: varchar("period", { length: 16 }).notNull(),
  type: varchar("type", { length: 32 }).notNull(),
  target: int("target").notNull(),
  rewardCoins: int("reward_coins").notNull().default(0),
  rewardExp: int("reward_exp").notNull().default(0),
  rewardTitleItemId: varchar("reward_title_item_id", { length: 64 }),
  sortOrder: int("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const catalogLevelUnlocks = mysqlTable("catalog_level_unlocks", {
  feature: varchar("feature", { length: 64 }).primaryKey(),
  id: varchar("id", { length: 64 }).notNull(),
  label: varchar("label", { length: 120 }).notNull(),
  description: text("description").notNull(),
  requiredLevel: int("required_level").notNull(),
  sortOrder: int("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const catalogQuestArcs = mysqlTable("catalog_quest_arcs", {
  key: varchar("quest_key", { length: 64 }).primaryKey(),
  id: varchar("id", { length: 64 }).notNull(),
  chapter: int("chapter").notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description").notNull(),
  objectiveType: varchar("objective_type", { length: 32 }).notNull(),
  target: int("target").notNull(),
  rewardCoins: int("reward_coins").notNull().default(0),
  rewardExp: int("reward_exp").notNull().default(0),
  unlockThemeId: varchar("unlock_theme_id", { length: 64 }),
  sortOrder: int("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const catalogSeasonRewards = mysqlTable("catalog_season_rewards", {
  level: int("level").primaryKey(),
  coins: int("coins").notNull().default(0),
  exp: int("exp").notNull().default(0),
  label: varchar("label", { length: 120 }).notNull(),
  active: boolean("active").notNull().default(true),
});

export type DbUser = typeof users.$inferSelect;
export type DbSession = typeof sessions.$inferSelect;
export type DbHabitQuestSave = typeof habitquestSaves.$inferSelect;
