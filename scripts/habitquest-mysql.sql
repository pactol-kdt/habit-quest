-- HabitQuest normalized MySQL schema
-- Applied automatically by ensureDatabase() on app boot as well.

CREATE TABLE IF NOT EXISTS save_meta (
  user_id VARCHAR(36) PRIMARY KEY NOT NULL,
  version INT NOT NULL DEFAULT 3,
  updated_at VARCHAR(40) NOT NULL,
  CONSTRAINT fk_save_meta_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS habits (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS habit_completions (
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
  CONSTRAINT fk_completions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exp_history (
  id VARCHAR(64) PRIMARY KEY NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  date VARCHAR(10) NOT NULL,
  amount INT NOT NULL,
  source VARCHAR(32) NOT NULL,
  label VARCHAR(255) NOT NULL,
  INDEX idx_exp_user (user_id),
  CONSTRAINT fk_exp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wallets (
  user_id VARCHAR(36) PRIMARY KEY NOT NULL,
  total_coins INT NOT NULL DEFAULT 0,
  lifetime_coins_earned INT NOT NULL DEFAULT 0,
  lifetime_coins_spent INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_wallets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_progress (
  user_id VARCHAR(36) PRIMARY KEY NOT NULL,
  total_exp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  current_streak INT NOT NULL DEFAULT 0,
  best_streak INT NOT NULL DEFAULT 0,
  total_completed_habits INT NOT NULL DEFAULT 0,
  last_completed_date VARCHAR(10) NULL,
  CONSTRAINT fk_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS daily_rewards (
  user_id VARCHAR(36) PRIMARY KEY NOT NULL,
  last_login_date VARCHAR(10) NULL,
  claimed_daily_login_date VARCHAR(10) NULL,
  claimed_daily_completion_reward_date VARCHAR(10) NULL,
  CONSTRAINT fk_daily_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_settings (
  user_id VARCHAR(36) PRIMARY KEY NOT NULL,
  display_name VARCHAR(64) NOT NULL DEFAULT '',
  onboarding_completed TINYINT(1) NOT NULL DEFAULT 0,
  reminders_enabled TINYINT(1) NOT NULL DEFAULT 0,
  reminder_time VARCHAR(8) NOT NULL DEFAULT '09:00',
  CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS equipped_cosmetics (
  user_id VARCHAR(36) PRIMARY KEY NOT NULL,
  title_item_id VARCHAR(64) NULL,
  frame_item_id VARCHAR(64) NULL,
  avatar_item_id VARCHAR(64) NULL,
  theme_item_id VARCHAR(64) NULL,
  CONSTRAINT fk_equipped_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS owned_shop_items (
  user_id VARCHAR(36) NOT NULL,
  item_id VARCHAR(64) NOT NULL,
  PRIMARY KEY (user_id, item_id),
  CONSTRAINT fk_owned_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id VARCHAR(36) NOT NULL,
  achievement_key VARCHAR(64) NOT NULL,
  unlocked TINYINT(1) NOT NULL DEFAULT 0,
  unlocked_at VARCHAR(40) NULL,
  rewarded_at VARCHAR(40) NULL,
  PRIMARY KEY (user_id, achievement_key),
  CONSTRAINT fk_achievements_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_challenges (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_level_unlocks (
  user_id VARCHAR(36) NOT NULL,
  feature VARCHAR(64) NOT NULL,
  unlocked TINYINT(1) NOT NULL DEFAULT 0,
  unlocked_at VARCHAR(40) NULL,
  PRIMARY KEY (user_id, feature),
  CONSTRAINT fk_unlocks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reward_systems (
  user_id VARCHAR(36) PRIMARY KEY NOT NULL,
  streak_freezes INT NOT NULL DEFAULT 1,
  streak_shield_dates JSON NOT NULL,
  last_freeze_used_date VARCHAR(40) NULL,
  last_comeback_date VARCHAR(10) NULL,
  today_combo INT NOT NULL DEFAULT 0,
  combo_date VARCHAR(10) NULL,
  party_code VARCHAR(16) NULL,
  party_weekly_target INT NOT NULL DEFAULT 20,
  CONSTRAINT fk_reward_systems_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_quest_arcs (
  user_id VARCHAR(36) NOT NULL,
  quest_key VARCHAR(64) NOT NULL,
  id VARCHAR(64) NOT NULL,
  progress INT NOT NULL DEFAULT 0,
  completed TINYINT(1) NOT NULL DEFAULT 0,
  claimed TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, quest_key),
  CONSTRAINT fk_quest_arcs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS season_passes (
  user_id VARCHAR(36) PRIMARY KEY NOT NULL,
  season_key VARCHAR(16) NOT NULL,
  xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  claimed_levels JSON NOT NULL,
  CONSTRAINT fk_season_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS weekly_bosses (
  user_id VARCHAR(36) PRIMARY KEY NOT NULL,
  week_key VARCHAR(10) NOT NULL,
  name VARCHAR(80) NOT NULL,
  max_hp INT NOT NULL,
  current_hp INT NOT NULL,
  defeated TINYINT(1) NOT NULL DEFAULT 0,
  reward_claimed TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_boss_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
