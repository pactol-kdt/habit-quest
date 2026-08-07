/**
 * Sync-ready relational schema for HabitQuest cloud migration.
 * Domain gameplay stays in `src/lib/habitquest/`; persistence adapters swap underneath.
 *
 * Live today: PostgreSQL normalized tables via drizzle (`src/lib/db`).
 * Legacy `habitquest_saves` blobs migrate once into rows on pull.
 */
export const HABITQUEST_SQL_SCHEMA = `
create table if not exists users (
  id uuid primary key,
  email text unique,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists habitquest_saves (
  user_id uuid primary key references users(id) on delete cascade,
  version integer not null default 2,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists habits (
  id text primary key,
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text not null default '',
  difficulty text not null,
  recurrence text not null,
  custom_days integer[] not null default '{}',
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists habit_completions (
  id text primary key,
  user_id uuid not null references users(id) on delete cascade,
  habit_id text not null references habits(id) on delete cascade,
  date date not null,
  exp_earned integer not null,
  streak_bonus_exp integer not null default 0,
  completed_at timestamptz not null,
  unique (user_id, habit_id, date)
);

create table if not exists exp_history (
  id text primary key,
  user_id uuid not null references users(id) on delete cascade,
  date date not null,
  amount integer not null,
  source text not null,
  label text not null
);

create table if not exists wallets (
  user_id uuid primary key references users(id) on delete cascade,
  total_coins integer not null default 0,
  lifetime_coins_earned integer not null default 0,
  lifetime_coins_spent integer not null default 0
);

create table if not exists shop_items (
  id text primary key,
  name text not null,
  category text not null,
  rarity text not null,
  price integer not null,
  required_level integer not null,
  required_feature text,
  exclusive boolean not null default false
);

create table if not exists owned_cosmetics (
  user_id uuid not null references users(id) on delete cascade,
  item_id text not null references shop_items(id),
  owned_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table if not exists equipped_cosmetics (
  user_id uuid primary key references users(id) on delete cascade,
  title_item_id text references shop_items(id),
  frame_item_id text references shop_items(id),
  avatar_item_id text references shop_items(id)
);

create table if not exists achievements (
  user_id uuid not null references users(id) on delete cascade,
  achievement_key text not null,
  unlocked boolean not null default false,
  unlocked_at timestamptz,
  rewarded_at timestamptz,
  primary key (user_id, achievement_key)
);

create table if not exists challenges (
  user_id uuid not null references users(id) on delete cascade,
  challenge_key text not null,
  period text not null,
  type text not null,
  target integer not null,
  progress integer not null default 0,
  completed boolean not null default false,
  claimed boolean not null default false,
  starts_at date not null,
  ends_at date not null,
  primary key (user_id, challenge_key, starts_at)
);

create table if not exists level_unlocks (
  user_id uuid not null references users(id) on delete cascade,
  feature text not null,
  unlocked boolean not null default false,
  unlocked_at timestamptz,
  primary key (user_id, feature)
);

create table if not exists user_settings (
  user_id uuid primary key references users(id) on delete cascade,
  reminders_enabled boolean not null default false,
  reminder_time text not null default '09:00',
  onboarding_completed boolean not null default false
);
`;

export const CLOUD_SYNC_TABLES = [
  "users",
  "sessions",
  "save_meta",
  "habits",
  "habit_completions",
  "exp_history",
  "wallets",
  "user_progress",
  "daily_rewards",
  "user_settings",
  "equipped_cosmetics",
  "owned_shop_items",
  "user_achievements",
  "user_challenges",
  "user_level_unlocks",
  "reward_systems",
  "user_quest_arcs",
  "season_passes",
  "weekly_bosses",
  "habitquest_saves",
] as const;
