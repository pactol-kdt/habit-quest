-- HabitQuest schema + catalog seed for PostgreSQL (pgAdmin 4)
--
-- How to run in pgAdmin 4 (two steps — CREATE DATABASE cannot run inside
-- a transaction or while already connected to habitquest):
--
-- STEP 1 — create the database
--   1. Connect to the maintenance DB (usually "postgres")
--   2. Open Query Tool on "postgres"
--   3. Run ONLY the CREATE DATABASE block below (F5)
--
-- STEP 2 — create tables + seed catalogs
--   1. Refresh Databases → right-click "habitquest" → Query Tool
--   2. Run everything from BEGIN onward (or open this file and select from BEGIN)
--
-- User/progress tables are empty. Catalog tables are seeded.
-- Re-running STEP 2 DROPs existing HabitQuest tables first.

-- ========== STEP 1: run while connected to "postgres" ==========
CREATE DATABASE habitquest
  WITH
    OWNER = CURRENT_USER
    ENCODING = 'UTF8'
    TEMPLATE = template0;

-- ========== STEP 2: run while connected to "habitquest" ==========
BEGIN;

DROP TABLE IF EXISTS weekly_bosses CASCADE;
DROP TABLE IF EXISTS season_passes CASCADE;
DROP TABLE IF EXISTS user_quest_arcs CASCADE;
DROP TABLE IF EXISTS reward_systems CASCADE;
DROP TABLE IF EXISTS user_level_unlocks CASCADE;
DROP TABLE IF EXISTS user_challenges CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS owned_shop_items CASCADE;
DROP TABLE IF EXISTS equipped_cosmetics CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS daily_rewards CASCADE;
DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS exp_history CASCADE;
DROP TABLE IF EXISTS habit_completions CASCADE;
DROP TABLE IF EXISTS habits CASCADE;
DROP TABLE IF EXISTS habitquest_saves CASCADE;
DROP TABLE IF EXISTS save_meta CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS catalog_season_rewards CASCADE;
DROP TABLE IF EXISTS catalog_quest_arcs CASCADE;
DROP TABLE IF EXISTS catalog_level_unlocks CASCADE;
DROP TABLE IF EXISTS catalog_challenges CASCADE;
DROP TABLE IF EXISTS catalog_achievements CASCADE;
DROP TABLE IF EXISTS catalog_shop_items CASCADE;

CREATE TABLE users (
  id varchar(36) PRIMARY KEY NOT NULL,
  email varchar(255) NOT NULL UNIQUE,
  password_hash varchar(255) NOT NULL,
  display_name varchar(64) NOT NULL DEFAULT '',
  role varchar(16) NOT NULL DEFAULT 'user',
  created_at varchar(40) NOT NULL,
  updated_at varchar(40) NOT NULL
);

CREATE TABLE sessions (
  id varchar(36) PRIMARY KEY NOT NULL,
  user_id varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash varchar(128) NOT NULL UNIQUE,
  expires_at varchar(40) NOT NULL,
  created_at varchar(40) NOT NULL
);

CREATE TABLE save_meta (
  user_id varchar(36) PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 3,
  updated_at varchar(40) NOT NULL
);

CREATE TABLE habitquest_saves (
  user_id varchar(36) PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 3,
  payload text NOT NULL,
  updated_at varchar(40) NOT NULL
);

CREATE TABLE habits (
  id varchar(64) PRIMARY KEY NOT NULL,
  user_id varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title varchar(160) NOT NULL,
  description text NOT NULL,
  difficulty varchar(16) NOT NULL,
  recurrence varchar(16) NOT NULL,
  custom_days jsonb NOT NULL,
  created_at varchar(40) NOT NULL,
  updated_at varchar(40) NOT NULL
);
CREATE INDEX idx_habits_user ON habits(user_id);

CREATE TABLE habit_completions (
  id varchar(64) PRIMARY KEY NOT NULL,
  user_id varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  habit_id varchar(64) NOT NULL,
  date varchar(10) NOT NULL,
  exp_earned integer NOT NULL,
  streak_bonus_exp integer NOT NULL DEFAULT 0,
  completed_at varchar(40) NOT NULL,
  crit boolean NOT NULL DEFAULT false,
  UNIQUE (user_id, habit_id, date)
);
CREATE INDEX idx_completions_user ON habit_completions(user_id);
CREATE INDEX idx_completions_user_date ON habit_completions(user_id, date);

CREATE TABLE exp_history (
  id varchar(64) PRIMARY KEY NOT NULL,
  user_id varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date varchar(10) NOT NULL,
  amount integer NOT NULL,
  source varchar(32) NOT NULL,
  label varchar(255) NOT NULL
);
CREATE INDEX idx_exp_user ON exp_history(user_id);

CREATE TABLE wallets (
  user_id varchar(36) PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_coins integer NOT NULL DEFAULT 0,
  lifetime_coins_earned integer NOT NULL DEFAULT 0,
  lifetime_coins_spent integer NOT NULL DEFAULT 0
);

CREATE TABLE user_progress (
  user_id varchar(36) PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_exp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  current_streak integer NOT NULL DEFAULT 0,
  best_streak integer NOT NULL DEFAULT 0,
  total_completed_habits integer NOT NULL DEFAULT 0,
  last_completed_date varchar(10)
);

CREATE TABLE daily_rewards (
  user_id varchar(36) PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_login_date varchar(10),
  claimed_daily_login_date varchar(10),
  claimed_daily_completion_reward_date varchar(10)
);

CREATE TABLE user_settings (
  user_id varchar(36) PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name varchar(64) NOT NULL DEFAULT '',
  onboarding_completed boolean NOT NULL DEFAULT false,
  reminders_enabled boolean NOT NULL DEFAULT false,
  reminder_time varchar(8) NOT NULL DEFAULT '09:00'
);

CREATE TABLE equipped_cosmetics (
  user_id varchar(36) PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title_item_id varchar(64),
  frame_item_id varchar(64),
  avatar_item_id varchar(64),
  theme_item_id varchar(64)
);

CREATE TABLE owned_shop_items (
  user_id varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id varchar(64) NOT NULL,
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE user_achievements (
  user_id varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_key varchar(64) NOT NULL,
  unlocked boolean NOT NULL DEFAULT false,
  unlocked_at varchar(40),
  rewarded_at varchar(40),
  PRIMARY KEY (user_id, achievement_key)
);

CREATE TABLE user_challenges (
  user_id varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_key varchar(64) NOT NULL,
  starts_at varchar(10) NOT NULL,
  id varchar(64) NOT NULL,
  title varchar(160) NOT NULL,
  description text NOT NULL,
  period varchar(16) NOT NULL,
  type varchar(32) NOT NULL,
  target integer NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  claimed boolean NOT NULL DEFAULT false,
  ends_at varchar(10) NOT NULL,
  reward_coins integer NOT NULL DEFAULT 0,
  reward_exp integer NOT NULL DEFAULT 0,
  reward_title_item_id varchar(64),
  PRIMARY KEY (user_id, challenge_key, starts_at)
);

CREATE TABLE user_level_unlocks (
  user_id varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature varchar(64) NOT NULL,
  unlocked boolean NOT NULL DEFAULT false,
  unlocked_at varchar(40),
  PRIMARY KEY (user_id, feature)
);

CREATE TABLE reward_systems (
  user_id varchar(36) PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  streak_freezes integer NOT NULL DEFAULT 1,
  streak_shield_dates jsonb NOT NULL,
  last_freeze_used_date varchar(40),
  last_comeback_date varchar(10),
  today_combo integer NOT NULL DEFAULT 0,
  combo_date varchar(10),
  party_code varchar(16),
  party_weekly_target integer NOT NULL DEFAULT 20,
  progress_settled_through_date varchar(10)
);

CREATE TABLE user_quest_arcs (
  user_id varchar(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quest_key varchar(64) NOT NULL,
  id varchar(64) NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  claimed boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, quest_key)
);

CREATE TABLE season_passes (
  user_id varchar(36) PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season_key varchar(16) NOT NULL,
  xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  claimed_levels jsonb NOT NULL
);

CREATE TABLE weekly_bosses (
  user_id varchar(36) PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_key varchar(10) NOT NULL,
  name varchar(80) NOT NULL,
  max_hp integer NOT NULL,
  current_hp integer NOT NULL,
  defeated boolean NOT NULL DEFAULT false,
  reward_claimed boolean NOT NULL DEFAULT false,
  settled_through_date varchar(10)
);

CREATE TABLE catalog_shop_items (
  id varchar(64) PRIMARY KEY NOT NULL,
  name varchar(120) NOT NULL,
  description text NOT NULL,
  category varchar(16) NOT NULL,
  rarity varchar(16) NOT NULL,
  price integer NOT NULL DEFAULT 0,
  required_level integer NOT NULL DEFAULT 1,
  required_feature varchar(64),
  preview varchar(80) NOT NULL,
  exclusive boolean NOT NULL DEFAULT false,
  theme_vars jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE catalog_achievements (
  achievement_key varchar(64) PRIMARY KEY NOT NULL,
  id varchar(64) NOT NULL,
  title varchar(160) NOT NULL,
  description text NOT NULL,
  category varchar(32) NOT NULL,
  icon varchar(40) NOT NULL,
  reward_coins integer NOT NULL DEFAULT 0,
  reward_exp integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE catalog_challenges (
  challenge_key varchar(64) PRIMARY KEY NOT NULL,
  title varchar(160) NOT NULL,
  description text NOT NULL,
  period varchar(16) NOT NULL,
  type varchar(32) NOT NULL,
  target integer NOT NULL,
  reward_coins integer NOT NULL DEFAULT 0,
  reward_exp integer NOT NULL DEFAULT 0,
  reward_title_item_id varchar(64),
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE catalog_level_unlocks (
  feature varchar(64) PRIMARY KEY NOT NULL,
  id varchar(64) NOT NULL,
  label varchar(120) NOT NULL,
  description text NOT NULL,
  required_level integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE catalog_quest_arcs (
  quest_key varchar(64) PRIMARY KEY NOT NULL,
  id varchar(64) NOT NULL,
  chapter integer NOT NULL,
  title varchar(160) NOT NULL,
  description text NOT NULL,
  objective_type varchar(32) NOT NULL,
  target integer NOT NULL,
  reward_coins integer NOT NULL DEFAULT 0,
  reward_exp integer NOT NULL DEFAULT 0,
  unlock_theme_id varchar(64),
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE catalog_season_rewards (
  level integer PRIMARY KEY NOT NULL,
  coins integer NOT NULL DEFAULT 0,
  exp integer NOT NULL DEFAULT 0,
  label varchar(120) NOT NULL,
  active boolean NOT NULL DEFAULT true
);

INSERT INTO catalog_achievements (achievement_key, id, title, description, category, icon, reward_coins, reward_exp, sort_order, active) VALUES
('buy-first-cosmetic', 'achievement_qyoafe2m', 'Buy First Cosmetic', 'Spend coins on identity, not just numbers.', 'shop', 'Mask', 10, 40, 8, true),
('complete-100-habits', 'achievement_u1vjtyy7', 'Complete 100 Habits', 'Hit triple digits on completed habits.', 'completion', 'Relic', 30, 150, 5, true),
('complete-50-habits', 'achievement_jctbzyoc', 'Complete 50 Habits', 'Stack enough clears to feel the system working.', 'completion', 'Ledger', 15, 80, 4, true),
('complete-weekly-challenge', 'achievement_h4d97mqi', 'Complete Weekly Challenge', 'Finish your first weekly contract.', 'challenge', 'Banner', 20, 100, 9, true),
('defeat-weekly-boss', 'achievement_zp06rwpj', 'Defeat Weekly Boss', 'Bring a weekly boss HP bar to zero.', 'challenge', 'Raid', 20, 100, 10, true),
('first-habit-completed', 'achievement_dgefbblc', 'First Habit Completed', 'Take the first clean step into your run.', 'beginner', 'Spark', 5, 20, 0, true),
('reach-level-10', 'achievement_yyztuq5l', 'Reach Level 10', 'Enter the elite progression bracket.', 'level', 'Astral', 50, 250, 7, true),
('reach-level-2', 'achievement_gl6hgoct', 'Reach Level 2', 'Prove that momentum is real.', 'beginner', 'Rune', 5, 30, 1, true),
('reach-level-5', 'achievement_l2g0sqlh', 'Reach Level 5', 'Break into the veteran tier.', 'level', 'Crown', 20, 120, 6, true),
('seven-day-streak', 'achievement_xzcg65um', '7 Day Streak', 'Hold the line for a full week.', 'streak', 'Flame', 10, 60, 2, true),
('thirty-day-streak', 'achievement_97x7c1vp', '30 Day Streak', 'Build a streak that changes identity, not mood.', 'streak', 'Inferno', 25, 200, 3, true);

INSERT INTO catalog_challenges (challenge_key, title, description, period, type, target, reward_coins, reward_exp, reward_title_item_id, sort_order, active) VALUES
('monthly-ascension', 'Monthly Ascension', 'Earn 2000 EXP this month.', 'monthly', 'exp-earned', 2000, 60, 400, 'title_monthly_archon', 1, true),
('weekly-contract', 'Weekly Contract', 'Complete 15 habits this week.', 'weekly', 'habit-completions', 15, 20, 150, 'title_weekly_vanguard', 0, true);

INSERT INTO catalog_level_unlocks (feature, id, label, description, required_level, sort_order, active) VALUES
('legendary-cosmetics', 'unlock_k27ntx2j', 'Legendary Cosmetics', 'Gain access to legendary avatars, titles, and frames.', 10, 7, true),
('monthly-challenges', 'unlock_46sgtpuc', 'Monthly Challenges', 'Open monthly climb challenges and rewards.', 7, 6, true),
('profile-frames', 'unlock_bhxtl3fm', 'Profile Frames', 'Buy and equip profile frame cosmetics.', 5, 5, true),
('quest-arcs', 'unlock_ce3vddib', 'Quest Arcs', 'Unlock multi-chapter quest arcs with chapter rewards.', 3, 2, true),
('season-pass', 'unlock_96mum1g9', 'Season Pass', 'Earn monthly season XP and claim tier rewards.', 4, 4, true),
('themes', 'unlock_j7x2q4v7', 'Themes', 'Equip visual themes that restyle the entire app.', 4, 3, true),
('titles', 'unlock_9y9wto0w', 'Titles', 'Unlock title cosmetics in the shop.', 2, 0, true),
('weekly-challenges', 'unlock_gbb2373x', 'Weekly Challenges', 'Activate weekly contract tracking and rewards.', 3, 1, true);

INSERT INTO catalog_quest_arcs (quest_key, id, chapter, title, description, objective_type, target, reward_coins, reward_exp, unlock_theme_id, sort_order, active) VALUES
('arc-ascension', 'quest_vdr70ugi', 3, 'Chapter 3 — Ascension', 'Hold a 7-day streak. Consistency becomes character.', 'streak-days', 7, 40, 200, 'theme_aurora', 2, true),
('arc-awakening', 'quest_vjgwmz2p', 1, 'Chapter 1 — Awakening', 'Complete 10 habits to prove the ritual sticks.', 'habit-completions', 10, 15, 80, NULL, 0, true),
('arc-tempering', 'quest_424rp11o', 2, 'Chapter 2 — Tempering', 'Clear 5 hard habits. Pressure forges identity.', 'hard-completions', 5, 25, 120, 'theme_ember', 1, true);

INSERT INTO catalog_season_rewards (level, coins, exp, label, active) VALUES
(2, 8, 40, 'Season spark', true),
(3, 12, 60, 'Momentum pack', true),
(4, 16, 80, 'Discipline cache', true),
(5, 24, 120, 'Season crest', true),
(6, 30, 150, 'Elite stipend', true),
(7, 40, 200, 'Season finale', true);

INSERT INTO catalog_shop_items (id, name, description, category, rarity, price, required_level, required_feature, preview, exclusive, theme_vars, sort_order, active) VALUES
('avatar_cyber_ninja', 'Cyber Ninja', 'Legendary stealth aesthetic for top-tier grinders.', 'avatar', 'legendary', 165, 10, 'legendary-cosmetics', 'CN', false, NULL, 12, true),
('avatar_knight', 'Knight', 'Classic heavy-armor discipline energy.', 'avatar', 'common', 18, 1, NULL, 'K', false, NULL, 9, true),
('avatar_samurai', 'Samurai', 'Minimalist steel and ruthless follow-through.', 'avatar', 'epic', 80, 5, NULL, 'S', false, NULL, 11, true),
('avatar_wizard', 'Wizard', 'A focused strategist with long-form energy.', 'avatar', 'rare', 36, 2, NULL, 'W', false, NULL, 10, true),
('frame_bronze', 'Bronze Frame', 'A grounded metallic profile frame.', 'frame', 'common', 20, 5, 'profile-frames', 'Bronze edge', false, NULL, 6, true),
('frame_galaxy', 'Galaxy Frame', 'An animated cosmic frame with deep-space color shifts.', 'frame', 'legendary', 150, 10, 'legendary-cosmetics', 'Stellar ring', false, NULL, 8, true),
('frame_neon', 'Neon Frame', 'Reactive cyan border with arcade energy.', 'frame', 'rare', 55, 5, 'profile-frames', 'Neon circuit', false, NULL, 7, true),
('theme_aurora', 'Aurora Theme', 'Northern lights wash — earned from Quest Chapter 3.', 'theme', 'legendary', 0, 4, 'themes', 'Aurora', true, '{"--color-bg":"#04151c","--color-cyan":"#2dd4bf","--color-gold":"#67e8f9","--color-pink":"#c084fc","--color-green":"#34d399","--hq-accent-ink":"#021016","--color-bg-muted":"#0a2630"}'::jsonb, 14, true),
('theme_ember', 'Ember Theme', 'Warm forge glow — earned from Quest Chapter 2.', 'theme', 'epic', 0, 4, 'themes', 'Ember', true, '{"--color-bg":"#1a0c08","--color-cyan":"#ff7a3d","--color-gold":"#fbbf24","--color-pink":"#fb7185","--color-green":"#fdba74","--hq-accent-ink":"#1a0a04","--color-bg-muted":"#2a140c"}'::jsonb, 13, true),
('theme_midnight', 'Midnight Theme', 'Deep night blues for focused late runs.', 'theme', 'rare', 90, 4, 'themes', 'Midnight', false, '{"--color-bg":"#030712","--color-cyan":"#60a5fa","--color-gold":"#93c5fd","--color-pink":"#818cf8","--color-green":"#38bdf8","--hq-accent-ink":"#020617","--color-bg-muted":"#0b1228"}'::jsonb, 15, true),
('title_beginner', 'Beginner', 'A humble title for a fresh adventurer.', 'title', 'common', 10, 1, 'titles', 'Novice tag', false, NULL, 0, true),
('title_discipline_master', 'Discipline Master', 'A title that implies hard-won consistency.', 'title', 'epic', 75, 5, 'titles', 'Master crest', false, NULL, 2, true),
('title_habit_hunter', 'Habit Hunter', 'For players who treat daily discipline like a hunt.', 'title', 'rare', 30, 2, 'titles', 'Hunter sigil', false, NULL, 1, true),
('title_monthly_archon', 'Monthly Archon', 'Exclusive title earned from a major monthly climb.', 'title', 'legendary', 0, 7, 'titles', 'Celestial seal', true, NULL, 5, true),
('title_night_grinder', 'Night Grinder', 'For the late-hour player who still closes quests.', 'title', 'epic', 85, 5, 'titles', 'Lunar badge', false, NULL, 3, true),
('title_weekly_vanguard', 'Weekly Vanguard', 'Exclusive title earned from clearing a weekly contract.', 'title', 'epic', 0, 3, 'titles', 'Challenge insignia', true, NULL, 4, true);

COMMIT;

-- Verify (run after import):
-- SELECT 'catalog_shop_items' AS t, count(*) FROM catalog_shop_items
-- UNION ALL SELECT 'catalog_achievements', count(*) FROM catalog_achievements
-- UNION ALL SELECT 'users', count(*) FROM users;
