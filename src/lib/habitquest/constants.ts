import type { HabitDifficulty, ShopRarity, UnlockFeature } from "~/types/habitquest";

export const STORAGE_KEY = "habitquest::save";

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

export const DAILY_LOGIN_COINS = 1;
export const DAILY_COMPLETION_COINS = 2;
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
};
