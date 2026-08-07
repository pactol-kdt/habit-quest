import "server-only";

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "~/lib/db/schema";

const DEFAULT_DATABASE_URL = "mysql://root@127.0.0.1:3306/habitquest";

function resolveDatabaseUrl() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url || url.startsWith("file:")) {
    return DEFAULT_DATABASE_URL;
  }
  return url;
}

type GlobalDb = {
  habitquestMysqlPool?: mysql.Pool;
  habitquestMigrated?: boolean;
  habitquestMigratePromise?: Promise<ReturnType<typeof createDrizzle>>;
};

const globalForDb = globalThis as typeof globalThis & GlobalDb;

function getPool() {
  if (!globalForDb.habitquestMysqlPool) {
    globalForDb.habitquestMysqlPool = mysql.createPool({
      uri: resolveDatabaseUrl(),
      waitForConnections: true,
      // Keep this low — Next.js HMR used to spawn a new pool per reload.
      connectionLimit: 5,
      maxIdle: 2,
      idleTimeout: 60_000,
      queueLimit: 50,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10_000,
    });
  }
  return globalForDb.habitquestMysqlPool;
}

function createDrizzle(pool: mysql.Pool) {
  return drizzle(pool, { schema, mode: "default" });
}

const pool = getPool();
export const db = createDrizzle(pool);

const DDL = [
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(64) NOT NULL DEFAULT '',
    role VARCHAR(16) NOT NULL DEFAULT 'user',
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    expires_at VARCHAR(40) NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS save_meta (
    user_id VARCHAR(36) PRIMARY KEY NOT NULL,
    version INT NOT NULL DEFAULT 3,
    updated_at VARCHAR(40) NOT NULL,
    CONSTRAINT fk_save_meta_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS habitquest_saves (
    user_id VARCHAR(36) PRIMARY KEY NOT NULL,
    version INT NOT NULL DEFAULT 3,
    payload LONGTEXT NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    CONSTRAINT fk_saves_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS habits (
    id VARCHAR(64) PRIMARY KEY NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(16) NOT NULL,
    recurrence VARCHAR(16) NOT NULL,
    custom_days JSON NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    INDEX idx_habits_user (user_id),
    CONSTRAINT fk_habits_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS habit_completions (
    id VARCHAR(64) PRIMARY KEY NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    habit_id VARCHAR(64) NOT NULL,
    date VARCHAR(10) NOT NULL,
    exp_earned INT NOT NULL,
    streak_bonus_exp INT NOT NULL DEFAULT 0,
    completed_at VARCHAR(40) NOT NULL,
    crit TINYINT(1) NOT NULL DEFAULT 0,
    INDEX idx_completions_user (user_id),
    INDEX idx_completions_user_date (user_id, date),
    UNIQUE KEY uniq_completions_user_habit_date (user_id, habit_id, date),
    CONSTRAINT fk_completions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS exp_history (
    id VARCHAR(64) PRIMARY KEY NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    date VARCHAR(10) NOT NULL,
    amount INT NOT NULL,
    source VARCHAR(32) NOT NULL,
    label VARCHAR(255) NOT NULL,
    INDEX idx_exp_user (user_id),
    CONSTRAINT fk_exp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS wallets (
    user_id VARCHAR(36) PRIMARY KEY NOT NULL,
    total_coins INT NOT NULL DEFAULT 0,
    lifetime_coins_earned INT NOT NULL DEFAULT 0,
    lifetime_coins_spent INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_wallets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS user_progress (
    user_id VARCHAR(36) PRIMARY KEY NOT NULL,
    total_exp INT NOT NULL DEFAULT 0,
    level INT NOT NULL DEFAULT 1,
    current_streak INT NOT NULL DEFAULT 0,
    best_streak INT NOT NULL DEFAULT 0,
    total_completed_habits INT NOT NULL DEFAULT 0,
    last_completed_date VARCHAR(10) NULL,
    CONSTRAINT fk_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS daily_rewards (
    user_id VARCHAR(36) PRIMARY KEY NOT NULL,
    last_login_date VARCHAR(10) NULL,
    claimed_daily_login_date VARCHAR(10) NULL,
    claimed_daily_completion_reward_date VARCHAR(10) NULL,
    CONSTRAINT fk_daily_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS user_settings (
    user_id VARCHAR(36) PRIMARY KEY NOT NULL,
    display_name VARCHAR(64) NOT NULL DEFAULT '',
    onboarding_completed TINYINT(1) NOT NULL DEFAULT 0,
    reminders_enabled TINYINT(1) NOT NULL DEFAULT 0,
    reminder_time VARCHAR(8) NOT NULL DEFAULT '09:00',
    CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS equipped_cosmetics (
    user_id VARCHAR(36) PRIMARY KEY NOT NULL,
    title_item_id VARCHAR(64) NULL,
    frame_item_id VARCHAR(64) NULL,
    avatar_item_id VARCHAR(64) NULL,
    theme_item_id VARCHAR(64) NULL,
    CONSTRAINT fk_equipped_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS owned_shop_items (
    user_id VARCHAR(36) NOT NULL,
    item_id VARCHAR(64) NOT NULL,
    PRIMARY KEY (user_id, item_id),
    CONSTRAINT fk_owned_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS user_achievements (
    user_id VARCHAR(36) NOT NULL,
    achievement_key VARCHAR(64) NOT NULL,
    unlocked TINYINT(1) NOT NULL DEFAULT 0,
    unlocked_at VARCHAR(40) NULL,
    rewarded_at VARCHAR(40) NULL,
    PRIMARY KEY (user_id, achievement_key),
    CONSTRAINT fk_achievements_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS user_challenges (
    user_id VARCHAR(36) NOT NULL,
    challenge_key VARCHAR(64) NOT NULL,
    starts_at VARCHAR(10) NOT NULL,
    id VARCHAR(64) NOT NULL,
    title VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    period VARCHAR(16) NOT NULL,
    type VARCHAR(32) NOT NULL,
    target INT NOT NULL,
    progress INT NOT NULL DEFAULT 0,
    completed TINYINT(1) NOT NULL DEFAULT 0,
    claimed TINYINT(1) NOT NULL DEFAULT 0,
    ends_at VARCHAR(10) NOT NULL,
    reward_coins INT NOT NULL DEFAULT 0,
    reward_exp INT NOT NULL DEFAULT 0,
    reward_title_item_id VARCHAR(64) NULL,
    PRIMARY KEY (user_id, challenge_key, starts_at),
    CONSTRAINT fk_challenges_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS user_level_unlocks (
    user_id VARCHAR(36) NOT NULL,
    feature VARCHAR(64) NOT NULL,
    unlocked TINYINT(1) NOT NULL DEFAULT 0,
    unlocked_at VARCHAR(40) NULL,
    PRIMARY KEY (user_id, feature),
    CONSTRAINT fk_unlocks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS reward_systems (
    user_id VARCHAR(36) PRIMARY KEY NOT NULL,
    streak_freezes INT NOT NULL DEFAULT 1,
    streak_shield_dates JSON NOT NULL,
    last_freeze_used_date VARCHAR(40) NULL,
    last_comeback_date VARCHAR(10) NULL,
    today_combo INT NOT NULL DEFAULT 0,
    combo_date VARCHAR(10) NULL,
    party_code VARCHAR(16) NULL,
    party_weekly_target INT NOT NULL DEFAULT 20,
    progress_settled_through_date VARCHAR(10) NULL,
    CONSTRAINT fk_reward_systems_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS user_quest_arcs (
    user_id VARCHAR(36) NOT NULL,
    quest_key VARCHAR(64) NOT NULL,
    id VARCHAR(64) NOT NULL,
    progress INT NOT NULL DEFAULT 0,
    completed TINYINT(1) NOT NULL DEFAULT 0,
    claimed TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, quest_key),
    CONSTRAINT fk_quest_arcs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS season_passes (
    user_id VARCHAR(36) PRIMARY KEY NOT NULL,
    season_key VARCHAR(16) NOT NULL,
    xp INT NOT NULL DEFAULT 0,
    level INT NOT NULL DEFAULT 1,
    claimed_levels JSON NOT NULL,
    CONSTRAINT fk_season_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS weekly_bosses (
    user_id VARCHAR(36) PRIMARY KEY NOT NULL,
    week_key VARCHAR(10) NOT NULL,
    name VARCHAR(80) NOT NULL,
    max_hp INT NOT NULL,
    current_hp INT NOT NULL,
    defeated TINYINT(1) NOT NULL DEFAULT 0,
    reward_claimed TINYINT(1) NOT NULL DEFAULT 0,
    settled_through_date VARCHAR(10) NULL,
    CONSTRAINT fk_boss_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS catalog_shop_items (
    id VARCHAR(64) PRIMARY KEY NOT NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(16) NOT NULL,
    rarity VARCHAR(16) NOT NULL,
    price INT NOT NULL DEFAULT 0,
    required_level INT NOT NULL DEFAULT 1,
    required_feature VARCHAR(64) NULL,
    preview VARCHAR(80) NOT NULL,
    exclusive TINYINT(1) NOT NULL DEFAULT 0,
    theme_vars JSON NULL,
    sort_order INT NOT NULL DEFAULT 0,
    active TINYINT(1) NOT NULL DEFAULT 1
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS catalog_achievements (
    achievement_key VARCHAR(64) PRIMARY KEY NOT NULL,
    id VARCHAR(64) NOT NULL,
    title VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(32) NOT NULL,
    icon VARCHAR(40) NOT NULL,
    reward_coins INT NOT NULL DEFAULT 0,
    reward_exp INT NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    active TINYINT(1) NOT NULL DEFAULT 1
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS catalog_challenges (
    challenge_key VARCHAR(64) PRIMARY KEY NOT NULL,
    title VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    period VARCHAR(16) NOT NULL,
    type VARCHAR(32) NOT NULL,
    target INT NOT NULL,
    reward_coins INT NOT NULL DEFAULT 0,
    reward_exp INT NOT NULL DEFAULT 0,
    reward_title_item_id VARCHAR(64) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    active TINYINT(1) NOT NULL DEFAULT 1
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS catalog_level_unlocks (
    feature VARCHAR(64) PRIMARY KEY NOT NULL,
    id VARCHAR(64) NOT NULL,
    label VARCHAR(120) NOT NULL,
    description TEXT NOT NULL,
    required_level INT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    active TINYINT(1) NOT NULL DEFAULT 1
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS catalog_quest_arcs (
    quest_key VARCHAR(64) PRIMARY KEY NOT NULL,
    id VARCHAR(64) NOT NULL,
    chapter INT NOT NULL,
    title VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    objective_type VARCHAR(32) NOT NULL,
    target INT NOT NULL,
    reward_coins INT NOT NULL DEFAULT 0,
    reward_exp INT NOT NULL DEFAULT 0,
    unlock_theme_id VARCHAR(64) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    active TINYINT(1) NOT NULL DEFAULT 1
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS catalog_season_rewards (
    level INT PRIMARY KEY NOT NULL,
    coins INT NOT NULL DEFAULT 0,
    exp INT NOT NULL DEFAULT 0,
    label VARCHAR(120) NOT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

async function runMigrations(database: ReturnType<typeof createDrizzle>) {
  const connection = await pool.getConnection();
  try {
    for (const statement of DDL) {
      await connection.query(statement);
    }

    try {
      await connection.query(
        `ALTER TABLE users ADD COLUMN role VARCHAR(16) NOT NULL DEFAULT 'user' AFTER display_name`,
      );
    } catch {
      // Column already exists.
    }

    try {
      await connection.query(
        `ALTER TABLE weekly_bosses ADD COLUMN settled_through_date VARCHAR(10) NULL AFTER reward_claimed`,
      );
    } catch {
      // Column already exists.
    }

    try {
      await connection.query(
        `ALTER TABLE reward_systems ADD COLUMN progress_settled_through_date VARCHAR(10) NULL AFTER party_weekly_target`,
      );
    } catch {
      // Column already exists.
    }

    // Deduplicate then enforce one clear per habit per day.
    try {
      await connection.query(`
        DELETE c1 FROM habit_completions c1
        INNER JOIN habit_completions c2
          ON c1.user_id = c2.user_id
         AND c1.habit_id = c2.habit_id
         AND c1.date = c2.date
         AND c1.id > c2.id
      `);
    } catch {
      // Table may not exist yet on first boot.
    }

    try {
      await connection.query(
        `ALTER TABLE habit_completions ADD UNIQUE KEY uniq_completions_user_habit_date (user_id, habit_id, date)`,
      );
    } catch {
      // Index already exists.
    }
  } finally {
    connection.release();
  }

  const { ensureCatalogSeeded } = await import("~/lib/db/catalog-repository");
  await ensureCatalogSeeded(database);
}

export async function ensureDatabase() {
  if (globalForDb.habitquestMigrated) {
    return db;
  }

  if (!globalForDb.habitquestMigratePromise) {
    globalForDb.habitquestMigratePromise = (async () => {
      await runMigrations(db);
      globalForDb.habitquestMigrated = true;
      return db;
    })().catch((error) => {
      globalForDb.habitquestMigratePromise = undefined;
      throw error;
    });
  }

  return globalForDb.habitquestMigratePromise;
}
