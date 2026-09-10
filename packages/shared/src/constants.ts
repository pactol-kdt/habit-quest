import type { HabitDifficulty, ShopRarity, UnlockFeature, UserSettings } from "./types";
import { DEFAULT_REMINDER_LOCAL_TIME } from "./reminder-time";

export const STORAGE_KEY = "habitquest::save";
/** Cached session user for optimistic refresh paint (non-secret profile fields only). */
export const AUTH_CACHE_KEY = "habitquest::auth-user";
/** Local-only play without an account. Progress stays in this browser until sign-up. */
export const GUEST_PLAY_KEY = "habitquest::guest-play";
export const SAVE_VERSION = 3;

/** When false (signed-in), HabitQuest will not write `habitquest::save`. */
let localPersistenceEnabled = true;

export function setLocalPersistenceEnabled(enabled: boolean) {
  localPersistenceEnabled = enabled;
}

export function isLocalPersistenceEnabled() {
  return localPersistenceEnabled;
}

export const DEFAULT_SETTINGS: UserSettings = {
  displayName: "",
  onboardingCompleted: false,
  remindersEnabled: false,
  reminderTime: DEFAULT_REMINDER_LOCAL_TIME,
};

export const DIFFICULTY_EXP: Record<HabitDifficulty, number> = {
  easy: 10,
  medium: 25,
  hard: 50,
};

export const DIFFICULTY_LABELS: Record<HabitDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export const RECURRENCE_LABELS = {
  daily: "Daily",
  weekly: "Weekly",
  custom: "Custom",
} as const;

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const STREAK_BONUSES: Record<number, number> = {
  3: 20,
  7: 50,
  14: 100,
  30: 250,
};

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];
export const STREAK_FREEZE_MILESTONES = [7, 14, 30];
export const MAX_STREAK_FREEZES = 2;
export const STREAK_FREEZE_COST = 40;
export const COMEBACK_MIN_GAP_DAYS = 3;
export const COMEBACK_COINS = 6;
export const COMEBACK_EXP = 40;
export const CRIT_CHANCE = 0.12;
export const CRIT_MULTIPLIER = 2;
/** Bonus EXP per clear after the first on the same day (locks in at settlement). */
export const COMBO_EXP_PER_EXTRA_CLEAR = 5;
/** Coin payouts when same-day clear count hits these thresholds. */
export const COMBO_COIN_THRESHOLDS = [4, 7] as const;
export const SETTLEMENT_LOCK_HINT = "Banks at midnight on next open.";
/** Short label for tonight's reversible progress (not the same as "Saving…"). */
export const PREVIEW_LABEL = "Preview";
export const CLEARED_TODAY_LABEL = "Cleared today";
/** @deprecated use PREVIEW_LABEL */
export const UNBANKED_LABEL = PREVIEW_LABEL;
/** Season XP per level — 29×40 = 1160 XP to L30 (~22 days at ~52 XP/day). */
export const SEASON_PASS_XP_PER_LEVEL = 40;
/** Highest claimable season tier (finale). */
export const SEASON_PASS_MAX_LEVEL = 30;
export const BOSS_DAMAGE: Record<HabitDifficulty, number> = {
  easy: 8,
  medium: 14,
  hard: 22,
};
export const BOSS_MAX_HP = 160;
export const BOSS_CLEAR_COINS = 20;
export const BOSS_CLEAR_EXP = 150;

export const DAILY_LOGIN_COINS = 1;
export const DAILY_COMPLETION_COINS = 1;
export const MIN_HABITS_FOR_DAILY_REWARD = 3;

export const RARITY_STYLES: Record<ShopRarity, string> = {
  common: "text-slate-200 bg-slate-200/10 border-slate-200/15",
  rare: "text-cyan-200 bg-cyan-300/10 border-cyan-300/20",
  epic: "text-pink-200 bg-pink-300/10 border-pink-300/20",
  legendary: "text-amber-200 bg-amber-300/10 border-amber-300/20",
};

export const UNLOCK_LABELS: Record<UnlockFeature, string> = {
  titles: "Titles",
  "weekly-challenges": "Weekly Challenges",
  "profile-frames": "Profile Frames",
  "monthly-challenges": "Monthly Challenges",
  "legendary-cosmetics": "Legendary Cosmetics",
  themes: "Themes",
  "quest-arcs": "Quest Arcs",
  "season-pass": "Season Pass",
};
