import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "~/lib/db/schema";

const DEFAULT_DATABASE_URL = "postgresql://postgres@127.0.0.1:5432/habitquest";

function resolveDatabaseUrl() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url || url.startsWith("file:")) {
    return DEFAULT_DATABASE_URL;
  }
  return url;
}

function needsSsl(connectionString: string) {
  try {
    const parsed = new URL(connectionString);
    const host = parsed.hostname.toLowerCase();
    const sslMode = parsed.searchParams.get("sslmode")?.toLowerCase();
    if (sslMode === "disable" || sslMode === "allow" || sslMode === "prefer") {
      return false;
    }
    if (sslMode === "require" || sslMode === "verify-ca" || sslMode === "verify-full") {
      return true;
    }
    return (
      host.includes("neon.tech") ||
      host.includes("supabase.co") ||
      host.includes("amazonaws.com") ||
      host.endsWith(".pooler.supabase.com")
    );
  } catch {
    return connectionString.includes("sslmode=require");
  }
}

type GlobalDb = {
  habitquestPgPool?: Pool;
  habitquestMigrated?: boolean;
  habitquestMigratePromise?: Promise<ReturnType<typeof createDrizzle>>;
};

const globalForDb = globalThis as typeof globalThis & GlobalDb;

function getPool() {
  if (!globalForDb.habitquestPgPool) {
    const connectionString = resolveDatabaseUrl();
    globalForDb.habitquestPgPool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 60_000,
      connectionTimeoutMillis: 15_000,
      ssl: needsSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
    });
  }
  return globalForDb.habitquestPgPool;
}

function createDrizzle(pool: Pool) {
  return drizzle(pool, { schema });
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
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(36) PRIMARY KEY NOT NULL,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    expires_at VARCHAR(40) NOT NULL,
    created_at VARCHAR(40) NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS save_meta (
    user_id VARCHAR(36) PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 3,
    updated_at VARCHAR(40) NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS habitquest_saves (
    user_id VARCHAR(36) PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 3,
    payload TEXT NOT NULL,
    updated_at VARCHAR(40) NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS habits (
    id VARCHAR(64) PRIMARY KEY NOT NULL,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(16) NOT NULL,
    recurrence VARCHAR(16) NOT NULL,
    custom_days JSONB NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id)`,
  `CREATE TABLE IF NOT EXISTS habit_completions (
    id VARCHAR(64) PRIMARY KEY NOT NULL,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    habit_id VARCHAR(64) NOT NULL,
    date VARCHAR(10) NOT NULL,
    exp_earned INTEGER NOT NULL,
    streak_bonus_exp INTEGER NOT NULL DEFAULT 0,
    completed_at VARCHAR(40) NOT NULL,
    crit BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (user_id, habit_id, date)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_completions_user ON habit_completions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_completions_user_date ON habit_completions(user_id, date)`,
  `CREATE TABLE IF NOT EXISTS exp_history (
    id VARCHAR(64) PRIMARY KEY NOT NULL,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date VARCHAR(10) NOT NULL,
    amount INTEGER NOT NULL,
    source VARCHAR(32) NOT NULL,
    label VARCHAR(255) NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_exp_user ON exp_history(user_id)`,
  `CREATE TABLE IF NOT EXISTS wallets (
    user_id VARCHAR(36) PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_coins INTEGER NOT NULL DEFAULT 0,
    lifetime_coins_earned INTEGER NOT NULL DEFAULT 0,
    lifetime_coins_spent INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS user_progress (
    user_id VARCHAR(36) PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_exp INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    current_streak INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    total_completed_habits INTEGER NOT NULL DEFAULT 0,
    last_completed_date VARCHAR(10)
  )`,
  `CREATE TABLE IF NOT EXISTS daily_rewards (
    user_id VARCHAR(36) PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_login_date VARCHAR(10),
    claimed_daily_login_date VARCHAR(10),
    claimed_daily_completion_reward_date VARCHAR(10)
  )`,
  `CREATE TABLE IF NOT EXISTS user_settings (
    user_id VARCHAR(36) PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(64) NOT NULL DEFAULT '',
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    reminders_enabled BOOLEAN NOT NULL DEFAULT false,
    reminder_time VARCHAR(8) NOT NULL DEFAULT '09:00',
    reminder_timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
    last_push_reminder_date VARCHAR(10)
  )`,
  `CREATE TABLE IF NOT EXISTS push_subscriptions (
    endpoint TEXT PRIMARY KEY NOT NULL,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id)`,
  `CREATE TABLE IF NOT EXISTS equipped_cosmetics (
    user_id VARCHAR(36) PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title_item_id VARCHAR(64),
    frame_item_id VARCHAR(64),
    avatar_item_id VARCHAR(64),
    theme_item_id VARCHAR(64)
  )`,
  `CREATE TABLE IF NOT EXISTS owned_shop_items (
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id VARCHAR(64) NOT NULL,
    PRIMARY KEY (user_id, item_id)
  )`,
  `CREATE TABLE IF NOT EXISTS user_achievements (
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_key VARCHAR(64) NOT NULL,
    unlocked BOOLEAN NOT NULL DEFAULT false,
    unlocked_at VARCHAR(40),
    rewarded_at VARCHAR(40),
    PRIMARY KEY (user_id, achievement_key)
  )`,
  `CREATE TABLE IF NOT EXISTS user_challenges (
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_key VARCHAR(64) NOT NULL,
    starts_at VARCHAR(10) NOT NULL,
    id VARCHAR(64) NOT NULL,
    title VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    period VARCHAR(16) NOT NULL,
    type VARCHAR(32) NOT NULL,
    target INTEGER NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT false,
    claimed BOOLEAN NOT NULL DEFAULT false,
    ends_at VARCHAR(10) NOT NULL,
    reward_coins INTEGER NOT NULL DEFAULT 0,
    reward_exp INTEGER NOT NULL DEFAULT 0,
    reward_title_item_id VARCHAR(64),
    PRIMARY KEY (user_id, challenge_key, starts_at)
  )`,
  `CREATE TABLE IF NOT EXISTS user_level_unlocks (
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature VARCHAR(64) NOT NULL,
    unlocked BOOLEAN NOT NULL DEFAULT false,
    unlocked_at VARCHAR(40),
    PRIMARY KEY (user_id, feature)
  )`,
  `CREATE TABLE IF NOT EXISTS reward_systems (
    user_id VARCHAR(36) PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    streak_freezes INTEGER NOT NULL DEFAULT 1,
    streak_shield_dates JSONB NOT NULL,
    last_freeze_used_date VARCHAR(40),
    last_comeback_date VARCHAR(10),
    today_combo INTEGER NOT NULL DEFAULT 0,
    combo_date VARCHAR(10),
    party_code VARCHAR(16),
    party_weekly_target INTEGER NOT NULL DEFAULT 20,
    progress_settled_through_date VARCHAR(10)
  )`,
  `CREATE TABLE IF NOT EXISTS user_quest_arcs (
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quest_key VARCHAR(64) NOT NULL,
    id VARCHAR(64) NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT false,
    claimed BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY (user_id, quest_key)
  )`,
  `CREATE TABLE IF NOT EXISTS season_passes (
    user_id VARCHAR(36) PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    season_key VARCHAR(16) NOT NULL,
    xp INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    claimed_levels JSONB NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS weekly_bosses (
    user_id VARCHAR(36) PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_key VARCHAR(10) NOT NULL,
    name VARCHAR(80) NOT NULL,
    max_hp INTEGER NOT NULL,
    current_hp INTEGER NOT NULL,
    defeated BOOLEAN NOT NULL DEFAULT false,
    reward_claimed BOOLEAN NOT NULL DEFAULT false,
    settled_through_date VARCHAR(10)
  )`,
  `CREATE TABLE IF NOT EXISTS catalog_shop_items (
    id VARCHAR(64) PRIMARY KEY NOT NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(16) NOT NULL,
    rarity VARCHAR(16) NOT NULL,
    price INTEGER NOT NULL DEFAULT 0,
    required_level INTEGER NOT NULL DEFAULT 1,
    required_feature VARCHAR(64),
    preview VARCHAR(80) NOT NULL,
    exclusive BOOLEAN NOT NULL DEFAULT false,
    theme_vars JSONB,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true
  )`,
  `CREATE TABLE IF NOT EXISTS catalog_achievements (
    achievement_key VARCHAR(64) PRIMARY KEY NOT NULL,
    id VARCHAR(64) NOT NULL,
    title VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(32) NOT NULL,
    icon VARCHAR(40) NOT NULL,
    reward_coins INTEGER NOT NULL DEFAULT 0,
    reward_exp INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true
  )`,
  `CREATE TABLE IF NOT EXISTS catalog_challenges (
    challenge_key VARCHAR(64) PRIMARY KEY NOT NULL,
    title VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    period VARCHAR(16) NOT NULL,
    type VARCHAR(32) NOT NULL,
    target INTEGER NOT NULL,
    reward_coins INTEGER NOT NULL DEFAULT 0,
    reward_exp INTEGER NOT NULL DEFAULT 0,
    reward_title_item_id VARCHAR(64),
    sort_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true
  )`,
  `CREATE TABLE IF NOT EXISTS catalog_level_unlocks (
    feature VARCHAR(64) PRIMARY KEY NOT NULL,
    id VARCHAR(64) NOT NULL,
    label VARCHAR(120) NOT NULL,
    description TEXT NOT NULL,
    required_level INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true
  )`,
  `CREATE TABLE IF NOT EXISTS catalog_quest_arcs (
    quest_key VARCHAR(64) PRIMARY KEY NOT NULL,
    id VARCHAR(64) NOT NULL,
    chapter INTEGER NOT NULL,
    title VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    objective_type VARCHAR(32) NOT NULL,
    target INTEGER NOT NULL,
    reward_coins INTEGER NOT NULL DEFAULT 0,
    reward_exp INTEGER NOT NULL DEFAULT 0,
    unlock_theme_id VARCHAR(64),
    sort_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true
  )`,
  `CREATE TABLE IF NOT EXISTS catalog_season_rewards (
    level INTEGER PRIMARY KEY NOT NULL,
    coins INTEGER NOT NULL DEFAULT 0,
    exp INTEGER NOT NULL DEFAULT 0,
    label VARCHAR(120) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true
  )`,
];

async function columnExists(
  client: { query: Pool["query"] },
  table: string,
  column: string,
) {
  const result = await client.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
       AND column_name = $2
     LIMIT 1`,
    [table, column],
  );
  return (result.rowCount ?? 0) > 0;
}

async function runMigrations(database: ReturnType<typeof createDrizzle>) {
  const client = await pool.connect();
  try {
    for (const statement of DDL) {
      await client.query(statement);
    }

    if (!(await columnExists(client, "users", "role"))) {
      await client.query(
        `ALTER TABLE users ADD COLUMN role VARCHAR(16) NOT NULL DEFAULT 'user'`,
      );
    }

    if (!(await columnExists(client, "weekly_bosses", "settled_through_date"))) {
      await client.query(
        `ALTER TABLE weekly_bosses ADD COLUMN settled_through_date VARCHAR(10)`,
      );
    }

    if (
      !(await columnExists(client, "reward_systems", "progress_settled_through_date"))
    ) {
      await client.query(
        `ALTER TABLE reward_systems ADD COLUMN progress_settled_through_date VARCHAR(10)`,
      );
    }

    if (!(await columnExists(client, "user_settings", "reminder_timezone"))) {
      await client.query(
        `ALTER TABLE user_settings ADD COLUMN reminder_timezone VARCHAR(64) NOT NULL DEFAULT 'UTC'`,
      );
    }

    if (!(await columnExists(client, "user_settings", "last_push_reminder_date"))) {
      await client.query(
        `ALTER TABLE user_settings ADD COLUMN last_push_reminder_date VARCHAR(10)`,
      );
    }

    // Deduplicate then enforce one clear per habit per day.
    try {
      await client.query(`
        DELETE FROM habit_completions c1
        USING habit_completions c2
        WHERE c1.user_id = c2.user_id
          AND c1.habit_id = c2.habit_id
          AND c1.date = c2.date
          AND c1.id > c2.id
      `);
    } catch {
      // Table may not exist yet on first boot.
    }

    try {
      await client.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS uniq_completions_user_habit_date
         ON habit_completions (user_id, habit_id, date)`,
      );
    } catch {
      // Index already exists via table UNIQUE constraint.
    }
  } finally {
    client.release();
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
