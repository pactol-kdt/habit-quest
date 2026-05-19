export type HabitDifficulty = "easy" | "medium" | "hard";
export type HabitRecurrence = "daily" | "weekly" | "custom";
export type ChallengePeriod = "weekly" | "monthly";
export type ChallengeType = "habit-completions" | "streak-days" | "exp-earned";
export type ShopCategory = "title" | "frame" | "avatar";
export type ShopRarity = "common" | "rare" | "epic" | "legendary";
export type UnlockFeature =
  | "titles"
  | "weekly-challenges"
  | "profile-frames"
  | "monthly-challenges"
  | "legendary-cosmetics";

export interface Habit {
  id: string;
  title: string;
  description: string;
  difficulty: HabitDifficulty;
  recurrence: HabitRecurrence;
  customDays: number[];
  createdAt: string;
  updatedAt: string;
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  date: string;
  expEarned: number;
  streakBonusExp: number;
  completedAt: string;
}

export interface ExpHistoryEntry {
  id: string;
  date: string;
  amount: number;
  source: "habit" | "streak" | "achievement" | "challenge";
  label: string;
}

export interface CoinWallet {
  totalCoins: number;
  lifetimeCoinsEarned: number;
  lifetimeCoinsSpent: number;
}

export interface DailyRewardState {
  lastLoginDate: string | null;
  claimedDailyLoginDate: string | null;
  claimedDailyCompletionRewardDate: string | null;
}

export interface ChallengeReward {
  coins: number;
  exp: number;
  titleItemId: string | null;
}

export interface Challenge {
  id: string;
  key: string;
  title: string;
  description: string;
  period: ChallengePeriod;
  type: ChallengeType;
  target: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  startsAt: string;
  endsAt: string;
  reward: ChallengeReward;
}

export interface AchievementReward {
  coins: number;
  exp: number;
}

export interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  category: "beginner" | "streak" | "completion" | "level" | "shop" | "challenge";
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
  reward: AchievementReward;
  rewardedAt: string | null;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: ShopCategory;
  rarity: ShopRarity;
  price: number;
  requiredLevel: number;
  requiredFeature: UnlockFeature | null;
  preview: string;
  exclusive: boolean;
  owned: boolean;
}

export interface EquippedItems {
  titleItemId: string | null;
  frameItemId: string | null;
  avatarItemId: string | null;
}

export interface LevelUnlock {
  id: string;
  feature: UnlockFeature;
  label: string;
  description: string;
  requiredLevel: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface UserProgress {
  totalExp: number;
  level: number;
  currentStreak: number;
  bestStreak: number;
  totalCompletedHabits: number;
  lastCompletedDate: string | null;
  expHistory: ExpHistoryEntry[];
}

export interface HabitQuestData {
  habits: Habit[];
  completions: HabitCompletion[];
  achievements: Achievement[];
  challenges: Challenge[];
  shopItems: ShopItem[];
  equippedItems: EquippedItems;
  wallet: CoinWallet;
  dailyRewards: DailyRewardState;
  levelUnlocks: LevelUnlock[];
  userProgress: UserProgress;
}

export interface HabitFormValues {
  title: string;
  description: string;
  difficulty: HabitDifficulty;
  recurrence: HabitRecurrence;
  customDays: number[];
}

export interface RewardToast {
  id: string;
  type: "coins" | "exp" | "achievement" | "unlock" | "shop" | "warning";
  title: string;
  description: string;
}

export interface FloatingReward {
  id: string;
  kind: "coins" | "exp";
  value: number;
  label: string;
}
