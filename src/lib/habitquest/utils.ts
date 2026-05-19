import {
  DAILY_COMPLETION_COINS,
  DAILY_LOGIN_COINS,
  DIFFICULTY_EXP,
  MIN_HABITS_FOR_DAILY_REWARD,
  RECURRENCE_LABELS,
  STREAK_BONUSES,
  UNLOCK_LABELS,
  WEEKDAY_LABELS,
} from "~/lib/habitquest/constants";
import type {
  Achievement,
  Challenge,
  DailyRewardState,
  ExpHistoryEntry,
  Habit,
  HabitCompletion,
  HabitDifficulty,
  HabitFormValues,
  HabitQuestData,
  LevelUnlock,
  ShopItem,
  UnlockFeature,
  UserProgress,
} from "~/types/habitquest";

export function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getTodayDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getLocalDateString(date = new Date()) {
  return getTodayDateKey(date);
}

export function fromDateString(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getDaysBetween(from: string, to: string) {
  const fromTime = startOfDay(fromDateString(from)).getTime();
  const toTime = startOfDay(fromDateString(to)).getTime();
  return Math.round((toTime - fromTime) / 86400000);
}

export function getStartOfCurrentWeekKey(referenceDate = new Date()) {
  const date = new Date(referenceDate);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return getTodayDateKey(date);
}

export function getEndOfCurrentWeekKey(referenceDate = new Date()) {
  const date = fromDateString(getStartOfCurrentWeekKey(referenceDate));
  date.setDate(date.getDate() + 6);
  return getTodayDateKey(date);
}

export function getStartOfCurrentMonthKey(referenceDate = new Date()) {
  return getTodayDateKey(new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1));
}

export function getEndOfCurrentMonthKey(referenceDate = new Date()) {
  return getTodayDateKey(new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0));
}

export function isDateInRange(date: string, start: string, end: string) {
  return getDaysBetween(start, date) >= 0 && getDaysBetween(date, end) >= 0;
}

export function formatDateLabel(date: string) {
  return fromDateString(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function getDifficultyExp(difficulty: HabitDifficulty) {
  return DIFFICULTY_EXP[difficulty];
}

export function getLevelState(totalExp: number) {
  let level = 1;
  let expIntoLevel = totalExp;
  let requiredExp = level * 100;

  while (expIntoLevel >= requiredExp) {
    expIntoLevel -= requiredExp;
    level += 1;
    requiredExp = level * 100;
  }

  return {
    level,
    expIntoLevel,
    requiredExp,
    progressPercent: requiredExp === 0 ? 0 : (expIntoLevel / requiredExp) * 100,
  };
}

export function createExpEntry(
  amount: number,
  date: string,
  source: ExpHistoryEntry["source"],
  label: string,
) {
  return {
    id: createId("exp"),
    amount,
    date,
    source,
    label,
  } satisfies ExpHistoryEntry;
}

export function hasCompletionForDate(
  completions: HabitCompletion[],
  habitId: string,
  date: string,
) {
  return completions.some((completion) => completion.habitId === habitId && completion.date === date);
}

export function isHabitDueOnDate(habit: Habit, date: string) {
  const habitCreatedDate = habit.createdAt.slice(0, 10);
  if (getDaysBetween(habitCreatedDate, date) < 0) {
    return false;
  }

  if (habit.recurrence === "daily") {
    return true;
  }

  if (habit.recurrence === "weekly") {
    return getDaysBetween(habitCreatedDate, date) % 7 === 0;
  }

  return habit.customDays.includes(fromDateString(date).getDay());
}

export function getDueHabitsForDate(habits: Habit[], date: string) {
  return habits.filter((habit) => isHabitDueOnDate(habit, date));
}

export function describeRecurrence(habit: Habit) {
  if (habit.recurrence !== "custom") {
    return RECURRENCE_LABELS[habit.recurrence];
  }

  if (!habit.customDays.length) {
    return "Custom";
  }

  return habit.customDays.map((day) => WEEKDAY_LABELS[day]).join(" • ");
}

export function getUniqueCompletionDates(completions: HabitCompletion[]) {
  return Array.from(new Set(completions.map((completion) => completion.date))).sort();
}

export function getStreakStats(
  completions: HabitCompletion[],
  referenceDate = getTodayDateKey(),
) {
  const uniqueDates = getUniqueCompletionDates(completions);
  if (!uniqueDates.length) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      lastCompletedDate: null,
    };
  }

  let bestStreak = 1;
  let runningBest = 1;

  for (let index = 1; index < uniqueDates.length; index += 1) {
    const gap = getDaysBetween(uniqueDates[index - 1]!, uniqueDates[index]!);
    runningBest = gap === 1 ? runningBest + 1 : 1;
    bestStreak = Math.max(bestStreak, runningBest);
  }

  const lastCompletedDate = uniqueDates[uniqueDates.length - 1]!;
  const daysSinceLastCompletion = getDaysBetween(lastCompletedDate, referenceDate);

  if (daysSinceLastCompletion > 1) {
    return {
      currentStreak: 0,
      bestStreak,
      lastCompletedDate,
    };
  }

  let currentStreak = 1;
  for (let index = uniqueDates.length - 1; index > 0; index -= 1) {
    const gap = getDaysBetween(uniqueDates[index - 1]!, uniqueDates[index]!);
    if (gap !== 1) {
      break;
    }
    currentStreak += 1;
  }

  return {
    currentStreak,
    bestStreak,
    lastCompletedDate,
  };
}

export function getStreakBonus(currentStreak: number) {
  return STREAK_BONUSES[currentStreak] ?? 0;
}

export function syncProgress(
  progress: UserProgress,
  completions: HabitCompletion[],
  extra: Partial<UserProgress>,
) {
  const streakStats = getStreakStats(completions);
  const levelState = getLevelState(extra.totalExp ?? progress.totalExp);

  return {
    ...progress,
    ...extra,
    level: levelState.level,
    currentStreak: streakStats.currentStreak,
    bestStreak: streakStats.bestStreak,
    lastCompletedDate: streakStats.lastCompletedDate,
  };
}

export function normalizeFormValues(values: HabitFormValues): HabitFormValues {
  return {
    ...values,
    title: values.title.trim(),
    description: values.description.trim(),
    customDays: [...values.customDays].sort((left, right) => left - right),
  };
}

export function getCompletionsInRange(
  completions: HabitCompletion[],
  start: string,
  end: string,
) {
  return completions.filter((completion) => isDateInRange(completion.date, start, end));
}

export function getExpInRange(
  expHistory: ExpHistoryEntry[],
  start: string,
  end: string,
) {
  return expHistory.filter((entry) => isDateInRange(entry.date, start, end));
}

export function hasClaimedDailyReward(
  dailyRewards: DailyRewardState,
  type: "login" | "completion",
  dateKey = getTodayDateKey(),
) {
  return type === "login"
    ? dailyRewards.claimedDailyLoginDate === dateKey
    : dailyRewards.claimedDailyCompletionRewardDate === dateKey;
}

export function checkDailyCompletion(data: HabitQuestData, dateKey = getTodayDateKey()) {
  const dueHabits = getDueHabitsForDate(data.habits, dateKey);
  const completedHabitIds = new Set(
    data.completions.filter((completion) => completion.date === dateKey).map((completion) => completion.habitId),
  );
  const completedDueHabits = dueHabits.filter((habit) => completedHabitIds.has(habit.id));

  const allRequiredHabitsCompleted =
    dueHabits.length > 0 && completedDueHabits.length === dueHabits.length;
  const minimumHabitThresholdMet =
    completedDueHabits.length >= MIN_HABITS_FOR_DAILY_REWARD;

  return {
    dateKey,
    dueHabits,
    completedDueHabits,
    completedCount: completedDueHabits.length,
    allRequiredHabitsCompleted,
    minimumHabitThresholdMet,
    qualifiesForReward: allRequiredHabitsCompleted && minimumHabitThresholdMet,
    completionRewardCoins: DAILY_COMPLETION_COINS,
  };
}

export function calculateChallengeProgress(
  challenge: Challenge,
  data: HabitQuestData,
  referenceDate = new Date(),
) {
  const expectedStartsAt =
    challenge.period === "weekly"
      ? getStartOfCurrentWeekKey(referenceDate)
      : getStartOfCurrentMonthKey(referenceDate);
  const expectedEndsAt =
    challenge.period === "weekly"
      ? getEndOfCurrentWeekKey(referenceDate)
      : getEndOfCurrentMonthKey(referenceDate);

  const shouldReset =
    challenge.startsAt !== expectedStartsAt || challenge.endsAt !== expectedEndsAt;

  const normalizedChallenge = shouldReset
    ? {
        ...challenge,
        progress: 0,
        completed: false,
        claimed: false,
        startsAt: expectedStartsAt,
        endsAt: expectedEndsAt,
      }
    : challenge;

  let progress = 0;

  if (normalizedChallenge.type === "habit-completions") {
    progress = getCompletionsInRange(data.completions, normalizedChallenge.startsAt, normalizedChallenge.endsAt).length;
  }

  if (normalizedChallenge.type === "streak-days") {
    progress = Math.min(data.userProgress.bestStreak, normalizedChallenge.target);
  }

  if (normalizedChallenge.type === "exp-earned") {
    progress = getExpInRange(
      data.userProgress.expHistory,
      normalizedChallenge.startsAt,
      normalizedChallenge.endsAt,
    ).reduce((sum, entry) => sum + entry.amount, 0);
  }

  return {
    ...normalizedChallenge,
    progress,
    completed: progress >= normalizedChallenge.target,
  };
}

export function unlockAchievements(data: HabitQuestData) {
  const now = new Date().toISOString();

  return data.achievements.map((achievement) => {
    if (achievement.unlocked) {
      return achievement;
    }

    const weeklyChallengeCompleted = data.challenges.some(
      (challenge) => challenge.period === "weekly" && challenge.completed,
    );
    const ownsCosmetic = data.shopItems.some((item) => item.owned);

    const shouldUnlock =
      (achievement.key === "first-habit-completed" && data.userProgress.totalCompletedHabits >= 1) ||
      (achievement.key === "reach-level-2" && data.userProgress.level >= 2) ||
      (achievement.key === "seven-day-streak" && data.userProgress.currentStreak >= 7) ||
      (achievement.key === "thirty-day-streak" && data.userProgress.currentStreak >= 30) ||
      (achievement.key === "complete-50-habits" && data.userProgress.totalCompletedHabits >= 50) ||
      (achievement.key === "complete-100-habits" && data.userProgress.totalCompletedHabits >= 100) ||
      (achievement.key === "reach-level-5" && data.userProgress.level >= 5) ||
      (achievement.key === "reach-level-10" && data.userProgress.level >= 10) ||
      (achievement.key === "buy-first-cosmetic" && ownsCosmetic) ||
      (achievement.key === "complete-weekly-challenge" && weeklyChallengeCompleted);

    if (!shouldUnlock) {
      return achievement;
    }

    return {
      ...achievement,
      unlocked: true,
      unlockedAt: now,
    };
  });
}

export function getPendingAchievementRewards(achievements: Achievement[]) {
  return achievements.filter((achievement) => achievement.unlocked && !achievement.rewardedAt);
}

export function checkLevelUnlocks(
  levelUnlocks: LevelUnlock[],
  level: number,
) {
  const now = new Date().toISOString();
  const newlyUnlocked: LevelUnlock[] = [];

  const updated = levelUnlocks.map((unlock) => {
    if (unlock.unlocked || level < unlock.requiredLevel) {
      return unlock;
    }

    const nextUnlock = {
      ...unlock,
      unlocked: true,
      unlockedAt: now,
    };

    newlyUnlocked.push(nextUnlock);
    return nextUnlock;
  });

  return {
    levelUnlocks: updated,
    newlyUnlocked,
  };
}

export function isFeatureUnlocked(
  levelUnlocks: LevelUnlock[],
  feature: UnlockFeature,
) {
  return levelUnlocks.some((unlock) => unlock.feature === feature && unlock.unlocked);
}

export function getNextLevelUnlock(levelUnlocks: LevelUnlock[], level: number) {
  return [...levelUnlocks]
    .filter((unlock) => !unlock.unlocked && unlock.requiredLevel > level)
    .sort((left, right) => left.requiredLevel - right.requiredLevel)[0] ?? null;
}

export function getUnlockLabel(feature: UnlockFeature) {
  return UNLOCK_LABELS[feature];
}

export function getEquippedItem(shopItems: ShopItem[], itemId: string | null) {
  return shopItems.find((item) => item.id === itemId) ?? null;
}

export function getWeeklyActivity(data: HabitQuestData, referenceDate = new Date()) {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(referenceDate);
    day.setDate(referenceDate.getDate() - (6 - index));
    const date = getTodayDateKey(day);
    const dueHabits = getDueHabitsForDate(data.habits, date);
    const completed = data.completions.filter((completion) => completion.date === date);
    const exp = data.userProgress.expHistory
      .filter((entry) => entry.date === date)
      .reduce((sum, entry) => sum + entry.amount, 0);

    return {
      date,
      label: WEEKDAY_LABELS[day.getDay()],
      completed: completed.length,
      due: dueHabits.length,
      exp,
      completionRate: dueHabits.length ? Math.round((completed.length / dueHabits.length) * 100) : 0,
    };
  });
}

export function getCompletionRate(data: HabitQuestData) {
  const weekly = getWeeklyActivity(data);
  const totals = weekly.reduce(
    (accumulator, day) => {
      accumulator.completed += day.completed;
      accumulator.due += day.due;
      return accumulator;
    },
    { completed: 0, due: 0 },
  );

  return totals.due ? Math.round((totals.completed / totals.due) * 100) : 0;
}

export function getMotivationalGreeting(progress: UserProgress) {
  const hour = new Date().getHours();
  const prefix =
    hour < 12 ? "Dawn patrol" : hour < 18 ? "Quest update" : "Night grind";

  if (progress.currentStreak >= 7) {
    return `${prefix}, legend. Your ${progress.currentStreak}-day streak is carrying serious momentum.`;
  }

  if (progress.level >= 5) {
    return `${prefix}, champion. Your unlock tree is opening up. Keep pushing.`;
  }

  return `${prefix}. Stack clean clears today, secure coins, and keep your run alive.`;
}

export function getProfileDisplay(
  shopItems: ShopItem[],
  equippedItems: HabitQuestData["equippedItems"],
) {
  const title = getEquippedItem(shopItems, equippedItems.titleItemId);
  const frame = getEquippedItem(shopItems, equippedItems.frameItemId);
  const avatar = getEquippedItem(shopItems, equippedItems.avatarItemId);

  return {
    title,
    frame,
    avatar,
  };
}

export function getDailyRewardSummary(dailyRewards: DailyRewardState, data: HabitQuestData, dateKey = getTodayDateKey()) {
  const dailyCompletion = checkDailyCompletion(data, dateKey);

  return {
    loginClaimed: hasClaimedDailyReward(dailyRewards, "login", dateKey),
    completionClaimed: hasClaimedDailyReward(dailyRewards, "completion", dateKey),
    dailyLoginCoins: DAILY_LOGIN_COINS,
    dailyCompletionCoins: DAILY_COMPLETION_COINS,
    ...dailyCompletion,
  };
}
