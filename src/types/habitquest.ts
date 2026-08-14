export type HabitDifficulty = "easy" | "medium" | "hard";
export type HabitRecurrence = "daily" | "weekly" | "custom";
export type ChallengePeriod = "weekly" | "monthly";
export type ChallengeType = "habit-completions" | "streak-days" | "exp-earned";
export type ShopCategory = "title" | "frame" | "avatar" | "theme";
export type ShopRarity = "common" | "rare" | "epic" | "legendary";
export type UnlockFeature =
  | "titles"
  | "weekly-challenges"
  | "profile-frames"
  | "monthly-challenges"
  | "legendary-cosmetics"
  | "themes"
  | "quest-arcs"
  | "season-pass";

export type QuestObjectiveType = "habit-completions" | "hard-completions" | "streak-days";
export type CelebrationKind =
  | "streak-milestone"
  | "boss-clear"
  | "quest-chapter"
  | "comeback"
  | "crit"
  | "season-level";

export interface Habit {
  id: string;
  title: string;
  description: string;
  difficulty: HabitDifficulty;
  recurrence: HabitRecurrence;
  customDays: number[];
  /** Free-text anchor: "After I pour coffee…" */
  stackAfter: string;
  /** Optional: stack after clearing another habit today. */
  stackAfterHabitId: string | null;
  /** Local trigger time `HH:mm`, or null for no timed trigger. */
  cueTime: string | null;
  /** Place / context trigger (desk, gym, kitchen…). */
  cueContext: string;
  /** Identity motivation: "I'm someone who…" / why it matters. */
  identityWhy: string;
  /** Feeling you want after the response — the motivation pull. */
  desiredFeeling: string;
  /** Bare minimum version when resistance is high. */
  tinyVersion: string;
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
  crit?: boolean;
}

export interface ExpHistoryEntry {
  id: string;
  date: string;
  amount: number;
  source:
    | "habit"
    | "streak"
    | "achievement"
    | "challenge"
    | "comeback"
    | "quest"
    | "boss"
    | "season"
    | "combo";
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
  themeVars?: Record<string, string>;
}

export interface EquippedItems {
  titleItemId: string | null;
  frameItemId: string | null;
  avatarItemId: string | null;
  themeItemId: string | null;
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

export interface UserSettings {
  displayName: string;
  onboardingCompleted: boolean;
  remindersEnabled: boolean;
  reminderTime: string;
}

export interface RewardSystems {
  streakFreezes: number;
  streakShieldDates: string[];
  lastFreezeUsedDate: string | null;
  lastComebackDate: string | null;
  todayCombo: number;
  comboDate: string | null;
  /** Last calendar date whose habit clears are fully applied to EXP/season/comeback/daily/boss. */
  progressSettledThroughDate: string | null;
}

export interface QuestArc {
  id: string;
  key: string;
  chapter: number;
  title: string;
  description: string;
  objectiveType: QuestObjectiveType;
  target: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  reward: {
    coins: number;
    exp: number;
    unlockThemeId: string | null;
  };
}

export interface SeasonPassReward {
  level: number;
  coins: number;
  exp: number;
  label: string;
}

export interface SeasonPassState {
  seasonKey: string;
  xp: number;
  level: number;
  claimedLevels: number[];
  rewards: SeasonPassReward[];
}

export interface WeeklyBossState {
  weekKey: string;
  name: string;
  maxHp: number;
  currentHp: number;
  defeated: boolean;
  rewardClaimed: boolean;
  /** Last calendar date whose damage is already baked into currentHp. */
  settledThroughDate: string | null;
}

export interface CelebrationEvent {
  id: string;
  kind: CelebrationKind;
  title: string;
  description: string;
}

/** Summary of days that just locked in during resolve. */
export interface SettlementRecap {
  throughDate: string;
  clears: number;
  habitExp: number;
  comboExp: number;
  comboCoins: number;
  comebackExp: number;
  comebackCoins: number;
  perfectDayCoins: number;
  bossDamage: number;
  streak: number;
}

export interface HabitQuestData {
  version: number;
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
  settings: UserSettings;
  rewardSystems: RewardSystems;
  questArcs: QuestArc[];
  seasonPass: SeasonPassState;
  weeklyBoss: WeeklyBossState;
}

export interface HabitFormValues {
  title: string;
  description: string;
  difficulty: HabitDifficulty;
  recurrence: HabitRecurrence;
  customDays: number[];
  stackAfter: string;
  stackAfterHabitId: string | null;
  cueTime: string | null;
  cueContext: string;
  identityWhy: string;
  desiredFeeling: string;
  tinyVersion: string;
}

export interface RewardToast {
  id: string;
  type: "coins" | "exp" | "achievement" | "unlock" | "shop" | "warning" | "crit";
  title: string;
  description: string;
}

export interface FloatingReward {
  id: string;
  kind: "coins" | "exp";
  value: number;
  label: string;
}
