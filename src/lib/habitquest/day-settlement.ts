import { DAILY_COMPLETION_COINS, SETTLEMENT_LOCK_HINT } from "~/lib/habitquest/constants";
import { getComboRewards } from "~/lib/habitquest/combo";
import {
  addSeasonPassXp,
  applyBossDamage,
  createCelebration,
  getActiveShieldDates,
  getBossDamageForDate,
  getEffectiveBossHp,
  getPendingBossDamage,
  isStreakMilestone,
  maybeApplyComeback,
  reconcileSeasonPass,
  reconcileWeeklyBoss,
  syncQuestArcs,
} from "~/lib/habitquest/rewards";
import {
  checkDailyCompletion,
  createExpEntry,
  createId,
  getLevelState,
  getTodayDateKey,
  syncProgress,
} from "~/lib/habitquest/utils";
import type {
  CelebrationEvent,
  FloatingReward,
  HabitQuestData,
  RewardToast,
  SeasonPassState,
  SettlementRecap,
  UserProgress,
  WeeklyBossState,
} from "~/types/habitquest";

export { SETTLEMENT_LOCK_HINT };

function shiftDateKey(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function eachDateInclusive(start: string, end: string) {
  if (start > end) {
    return [] as string[];
  }
  const dates: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    dates.push(cursor);
    cursor = shiftDateKey(cursor, 1);
  }
  return dates;
}

export function getSeasonXpForCompletion(expEarned: number) {
  return Math.max(10, Math.round(expEarned * 0.5));
}

export function getPendingCompletions(data: HabitQuestData, today = getTodayDateKey()) {
  return data.completions.filter((completion) => completion.date === today);
}

export function getPendingHabitExp(data: HabitQuestData, today = getTodayDateKey()) {
  return getPendingCompletions(data, today).reduce(
    (sum, completion) => sum + completion.expEarned + completion.streakBonusExp,
    0,
  );
}

export function getPendingSeasonXp(data: HabitQuestData, today = getTodayDateKey()) {
  return getPendingCompletions(data, today).reduce(
    (sum, completion) => sum + getSeasonXpForCompletion(completion.expEarned),
    0,
  );
}

export function getPendingComebackPreview(data: HabitQuestData, today = getTodayDateKey()) {
  const pending = getPendingCompletions(data, today);
  if (!pending.length) {
    return { coins: 0, exp: 0 };
  }

  const priorCompletions = data.completions.filter((completion) => completion.date < today);
  const result = maybeApplyComeback(data.rewardSystems, priorCompletions, today);
  return result.triggered
    ? { coins: result.coins, exp: result.exp }
    : { coins: 0, exp: 0 };
}

export function getPendingComboPreview(data: HabitQuestData, today = getTodayDateKey()) {
  return getComboRewards(getPendingCompletions(data, today).length);
}

export function getEffectiveUserProgress(
  data: HabitQuestData,
  today = getTodayDateKey(),
): UserProgress {
  const pendingExp = getPendingHabitExp(data, today);
  const pendingComeback = getPendingComebackPreview(data, today);
  const pendingCombo = getPendingComboPreview(data, today);
  const shields = getActiveShieldDates(data.rewardSystems);

  return syncProgress(
    data.userProgress,
    data.completions,
    {
      totalCompletedHabits: data.completions.length,
      totalExp:
        data.userProgress.totalExp + pendingExp + pendingComeback.exp + pendingCombo.exp,
      expHistory: data.userProgress.expHistory,
    },
    shields,
    today,
  );
}

export function getEffectiveSeasonPass(
  data: HabitQuestData,
  today = getTodayDateKey(),
): SeasonPassState {
  const settled = reconcileSeasonPass(data.seasonPass);
  return addSeasonPassXp(settled, getPendingSeasonXp(data, today));
}

export function getEffectiveWeeklyBoss(
  data: HabitQuestData,
  today = getTodayDateKey(),
): WeeklyBossState & { pendingDamage: number; effectiveHp: number } {
  const boss = reconcileWeeklyBoss(data.weeklyBoss);
  const pendingDamage = getPendingBossDamage(data, today);
  return {
    ...boss,
    pendingDamage,
    effectiveHp: getEffectiveBossHp(boss, pendingDamage),
  };
}

export function getEffectiveWalletCoins(data: HabitQuestData, today = getTodayDateKey()) {
  return (
    data.wallet.totalCoins +
    getPendingComebackPreview(data, today).coins +
    getPendingComboPreview(data, today).coins
  );
}

export function getEffectiveQuestArcs(data: HabitQuestData, today = getTodayDateKey()) {
  const previewProgress = getEffectiveUserProgress(data, today);
  return syncQuestArcs(
    data.questArcs,
    {
      ...data,
      userProgress: previewProgress,
    },
    today,
  );
}

function rebuildSeasonXpFromSettledCompletions(
  data: HabitQuestData,
  settledThrough: string | null,
): SeasonPassState {
  let pass = reconcileSeasonPass(data.seasonPass);
  if (!settledThrough) {
    return {
      ...pass,
      xp: 0,
      level: 1,
    };
  }

  const seasonMonth = pass.seasonKey;
  const xp = data.completions.reduce((sum, completion) => {
    if (completion.date > settledThrough) {
      return sum;
    }
    if (!completion.date.startsWith(seasonMonth)) {
      return sum;
    }
    return sum + getSeasonXpForCompletion(completion.expEarned);
  }, 0);

  pass = { ...pass, xp: 0, level: 1 };
  return addSeasonPassXp(pass, xp);
}

function rebuildBossFromSettledCompletions(
  data: HabitQuestData,
  settledThrough: string | null,
): WeeklyBossState {
  let boss = reconcileWeeklyBoss(data.weeklyBoss);
  if (!settledThrough || settledThrough < boss.weekKey) {
    return {
      ...boss,
      currentHp: boss.maxHp,
      defeated: false,
      settledThroughDate: null,
    };
  }

  const end = settledThrough;
  const damage = eachDateInclusive(boss.weekKey, end).reduce(
    (sum, dateKey) => sum + getBossDamageForDate(data, dateKey),
    0,
  );
  const currentHp = Math.max(0, boss.maxHp - damage);
  return {
    ...boss,
    currentHp,
    defeated: currentHp <= 0,
    settledThroughDate: end,
  };
}

function stripPendingDayFromProgress(data: HabitQuestData, today: string): HabitQuestData {
  const pendingSources = new Set(["habit", "streak", "comeback"]);
  let removedExp = 0;
  const expHistory = data.userProgress.expHistory.filter((entry) => {
    if (entry.date === today && pendingSources.has(entry.source)) {
      removedExp += entry.amount;
      return false;
    }
    return true;
  });

  const shields = getActiveShieldDates(data.rewardSystems);
  const settledCompletions = data.completions.filter((completion) => completion.date < today);

  return {
    ...data,
    userProgress: syncProgress(
      data.userProgress,
      settledCompletions,
      {
        totalCompletedHabits: settledCompletions.length,
        totalExp: Math.max(0, data.userProgress.totalExp - removedExp),
        expHistory,
      },
      shields,
      today,
    ),
  };
}

export type DaySettlementResult = {
  data: HabitQuestData;
  celebrations: CelebrationEvent[];
  rewardToasts: RewardToast[];
  floatingRewards: FloatingReward[];
  recap: SettlementRecap | null;
};

function emptyRecap(throughDate: string): SettlementRecap {
  return {
    throughDate,
    clears: 0,
    habitExp: 0,
    comboExp: 0,
    comboCoins: 0,
    comebackExp: 0,
    comebackCoins: 0,
    perfectDayCoins: 0,
    bossDamage: 0,
    streak: 0,
  };
}

function createFloating(kind: FloatingReward["kind"], value: number, label: string): FloatingReward {
  return {
    id: createId("float"),
    kind,
    value,
    label,
  };
}

function createToast(
  type: RewardToast["type"],
  title: string,
  description: string,
): RewardToast {
  return {
    id: createId("toast"),
    type,
    title,
    description,
  };
}

/**
 * Locks finished calendar days into permanent progress.
 * Today's clears stay pending (preview-only) until the next day resolves.
 */
export function settleHabitDayProgress(
  input: HabitQuestData,
  today = getTodayDateKey(),
): DaySettlementResult {
  let data: HabitQuestData = {
    ...input,
    rewardSystems: {
      ...input.rewardSystems,
      progressSettledThroughDate: input.rewardSystems.progressSettledThroughDate ?? null,
    },
  };

  const celebrations: CelebrationEvent[] = [];
  const rewardToasts: RewardToast[] = [];
  const floatingRewards: FloatingReward[] = [];
  const committedThrough = shiftDateKey(today, -1);
  const recap = emptyRecap(committedThrough);
  let settledAnyDay = false;

  // Migration: first time with null cursor — strip today from settled stats and rebuild.
  if (data.rewardSystems.progressSettledThroughDate == null) {
    data = stripPendingDayFromProgress(data, today);
    const settledThrough = committedThrough;

    data.seasonPass = rebuildSeasonXpFromSettledCompletions(data, settledThrough);
    data.weeklyBoss = rebuildBossFromSettledCompletions(data, settledThrough);
    data.rewardSystems = {
      ...data.rewardSystems,
      progressSettledThroughDate: settledThrough,
    };

    const settledCompletions = data.completions.filter(
      (completion) => completion.date <= settledThrough,
    );
    data.userProgress = syncProgress(
      data.userProgress,
      settledCompletions,
      {
        totalCompletedHabits: settledCompletions.length,
        totalExp: data.userProgress.totalExp,
        expHistory: data.userProgress.expHistory,
      },
      getActiveShieldDates(data.rewardSystems),
      today,
    );
    data.questArcs = syncQuestArcs(data.questArcs, data, settledThrough);

    return { data, celebrations, rewardToasts, floatingRewards, recap: null };
  }

  const settleStart = shiftDateKey(data.rewardSystems.progressSettledThroughDate, 1);
  if (settleStart > committedThrough) {
    data.questArcs = syncQuestArcs(
      data.questArcs,
      data,
      data.rewardSystems.progressSettledThroughDate,
    );
    return { data, celebrations, rewardToasts, floatingRewards, recap: null };
  }

  for (const dateKey of eachDateInclusive(settleStart, committedThrough)) {
    settledAnyDay = true;
    const dayCompletions = data.completions.filter((completion) => completion.date === dateKey);
    const priorCompletions = data.completions.filter((completion) => completion.date < dateKey);
    recap.clears += dayCompletions.length;
    recap.throughDate = dateKey;

    if (dayCompletions.length) {
      const comeback = maybeApplyComeback(data.rewardSystems, priorCompletions, dateKey);
      data.rewardSystems = comeback.systems;
      if (comeback.triggered) {
        recap.comebackCoins += comeback.coins;
        recap.comebackExp += comeback.exp;
        data.wallet = {
          ...data.wallet,
          totalCoins: data.wallet.totalCoins + comeback.coins,
          lifetimeCoinsEarned: data.wallet.lifetimeCoinsEarned + comeback.coins,
        };
        data.userProgress = {
          ...data.userProgress,
          totalExp: data.userProgress.totalExp + comeback.exp,
          expHistory: [
            createExpEntry(comeback.exp, dateKey, "comeback", "Comeback bonus"),
            ...data.userProgress.expHistory,
          ],
        };
        floatingRewards.push(createFloating("coins", comeback.coins, "Comeback"));
        floatingRewards.push(createFloating("exp", comeback.exp, "Comeback"));
        celebrations.push(
          createCelebration(
            "comeback",
            "Comeback secured",
            `Welcome back — +${comeback.coins} coins and +${comeback.exp} EXP.`,
          ),
        );
        rewardToasts.push(
          createToast("unlock", "Comeback bonus", `+${comeback.coins} coins, +${comeback.exp} EXP`),
        );
      }
    }

    let dayHadExp = false;
    for (const completion of dayCompletions) {
      const habit = data.habits.find((entry) => entry.id === completion.habitId);
      const habitLabel = habit?.title ?? "Habit";
      dayHadExp = true;
      recap.habitExp += completion.expEarned + completion.streakBonusExp;

      data.userProgress = {
        ...data.userProgress,
        totalExp: data.userProgress.totalExp + completion.expEarned,
        expHistory: [
          createExpEntry(
            completion.expEarned,
            dateKey,
            "habit",
            completion.crit ? `${habitLabel} critical hit` : `${habitLabel} completed`,
          ),
          ...data.userProgress.expHistory,
        ],
      };

      if (completion.streakBonusExp > 0) {
        data.userProgress = {
          ...data.userProgress,
          totalExp: data.userProgress.totalExp + completion.streakBonusExp,
          expHistory: [
            createExpEntry(completion.streakBonusExp, dateKey, "streak", "Streak bonus"),
            ...data.userProgress.expHistory,
          ],
        };
      }
    }

    const comboReward = getComboRewards(dayCompletions.length);
    if (comboReward.exp > 0 || comboReward.coins > 0) {
      recap.comboExp += comboReward.exp;
      recap.comboCoins += comboReward.coins;
      if (comboReward.exp > 0) {
        data.userProgress = {
          ...data.userProgress,
          totalExp: data.userProgress.totalExp + comboReward.exp,
          expHistory: [
            createExpEntry(
              comboReward.exp,
              dateKey,
              "combo",
              `Combo x${dayCompletions.length}`,
            ),
            ...data.userProgress.expHistory,
          ],
        };
        floatingRewards.push(createFloating("exp", comboReward.exp, "Combo"));
      }
      if (comboReward.coins > 0) {
        data.wallet = {
          ...data.wallet,
          totalCoins: data.wallet.totalCoins + comboReward.coins,
          lifetimeCoinsEarned: data.wallet.lifetimeCoinsEarned + comboReward.coins,
        };
        floatingRewards.push(createFloating("coins", comboReward.coins, "Combo"));
      }
      rewardToasts.push(
        createToast(
          "unlock",
          "Combo locked in",
          `x${dayCompletions.length} clears — +${comboReward.exp} EXP` +
            (comboReward.coins ? `, +${comboReward.coins} coins` : "") +
            ".",
        ),
      );
    }

    const daySeasonXp = dayCompletions.reduce(
      (sum, completion) => sum + getSeasonXpForCompletion(completion.expEarned),
      0,
    );
    if (daySeasonXp > 0) {
      const previousLevel = data.seasonPass.level;
      data.seasonPass = addSeasonPassXp(reconcileSeasonPass(data.seasonPass), daySeasonXp);
      if (data.seasonPass.level > previousLevel) {
        celebrations.push(
          createCelebration(
            "season-level",
            `Season Level ${data.seasonPass.level}`,
            "Season Pass leveled up from settled clears.",
          ),
        );
        rewardToasts.push(
          createToast(
            "unlock",
            "Season level up",
            `Season Pass reached level ${data.seasonPass.level}.`,
          ),
        );
      }
    }

    const weekBoss = reconcileWeeklyBoss(data.weeklyBoss);
    const dayBossDamage = getBossDamageForDate(data, dateKey);
    const bossHit = applyBossDamage(weekBoss, dayBossDamage);
    recap.bossDamage += dayBossDamage;
    data.weeklyBoss = {
      ...bossHit.boss,
      settledThroughDate: dateKey >= weekBoss.weekKey ? dateKey : weekBoss.settledThroughDate,
    };
    if (bossHit.defeatedNow) {
      celebrations.push(
        createCelebration(
          "boss-clear",
          `${data.weeklyBoss.name} defeated`,
          "Claim the weekly boss clear reward when ready.",
        ),
      );
    }

    const daily = checkDailyCompletion(data, dateKey);
    if (daily.qualifiesForReward) {
      recap.perfectDayCoins += DAILY_COMPLETION_COINS;
      data.wallet = {
        ...data.wallet,
        totalCoins: data.wallet.totalCoins + DAILY_COMPLETION_COINS,
        lifetimeCoinsEarned: data.wallet.lifetimeCoinsEarned + DAILY_COMPLETION_COINS,
      };
      data.dailyRewards = {
        ...data.dailyRewards,
        claimedDailyCompletionRewardDate: dateKey,
      };
      floatingRewards.push(createFloating("coins", DAILY_COMPLETION_COINS, "Perfect day"));
      rewardToasts.push(
        createToast(
          "coins",
          "Perfect day locked in",
          `+${DAILY_COMPLETION_COINS} coins from ${dateKey}.`,
        ),
      );
    }

    data.rewardSystems = {
      ...data.rewardSystems,
      progressSettledThroughDate: dateKey,
    };

    const settledCompletions = data.completions.filter((completion) => completion.date <= dateKey);
    data.userProgress = syncProgress(
      data.userProgress,
      settledCompletions,
      {
        totalCompletedHabits: settledCompletions.length,
        totalExp: data.userProgress.totalExp,
        expHistory: data.userProgress.expHistory,
      },
      getActiveShieldDates(data.rewardSystems),
      shiftDateKey(dateKey, 1),
    );

    if (dayHadExp && isStreakMilestone(data.userProgress.currentStreak)) {
      celebrations.push(
        createCelebration(
          "streak-milestone",
          `${data.userProgress.currentStreak}-day streak`,
          "Your consistency just crossed a milestone.",
        ),
      );
    }

    data.questArcs = syncQuestArcs(data.questArcs, data, dateKey);
  }

  const levelState = getLevelState(data.userProgress.totalExp);
  data.userProgress = {
    ...data.userProgress,
    level: levelState.level,
  };
  recap.streak = data.userProgress.currentStreak;

  const hasPayout =
    recap.clears > 0 ||
    recap.habitExp > 0 ||
    recap.comboExp > 0 ||
    recap.comboCoins > 0 ||
    recap.comebackExp > 0 ||
    recap.comebackCoins > 0 ||
    recap.perfectDayCoins > 0 ||
    recap.bossDamage > 0;

  return {
    data,
    celebrations,
    rewardToasts,
    floatingRewards,
    recap: settledAnyDay && hasPayout ? recap : null,
  };
}
