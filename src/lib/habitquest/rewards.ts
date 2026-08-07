import {
  BOSS_DAMAGE,
  COMEBACK_COINS,
  COMEBACK_EXP,
  COMEBACK_MIN_GAP_DAYS,
  CRIT_CHANCE,
  CRIT_MULTIPLIER,
  MAX_STREAK_FREEZES,
  SEASON_PASS_XP_PER_LEVEL,
  STREAK_FREEZE_MILESTONES,
  STREAK_MILESTONES,
} from "~/lib/habitquest/constants";
import {
  createId,
  getDaysBetween,
  getStartOfCurrentMonthKey,
  getStartOfCurrentWeekKey,
  getStreakStats,
  getTodayDateKey,
} from "~/lib/habitquest/utils";
import type {
  CelebrationEvent,
  Habit,
  HabitCompletion,
  HabitDifficulty,
  HabitQuestData,
  QuestArc,
  RewardSystems,
  SeasonPassState,
  WeeklyBossState,
} from "~/types/habitquest";

export function createDefaultRewardSystems(): RewardSystems {
  return {
    streakFreezes: 1,
    streakShieldDates: [],
    lastFreezeUsedDate: null,
    lastComebackDate: null,
    todayCombo: 0,
    comboDate: null,
    progressSettledThroughDate: null,
  };
}

export function createQuestArcs(): QuestArc[] {
  return [
    {
      id: createId("quest"),
      key: "arc-awakening",
      chapter: 1,
      title: "Chapter 1 — Awakening",
      description: "Complete 10 habits to prove the ritual sticks.",
      objectiveType: "habit-completions",
      target: 10,
      progress: 0,
      completed: false,
      claimed: false,
      reward: { coins: 15, exp: 80, unlockThemeId: null },
    },
    {
      id: createId("quest"),
      key: "arc-tempering",
      chapter: 2,
      title: "Chapter 2 — Tempering",
      description: "Clear 5 hard habits. Pressure forges identity.",
      objectiveType: "hard-completions",
      target: 5,
      progress: 0,
      completed: false,
      claimed: false,
      reward: { coins: 25, exp: 120, unlockThemeId: "theme_ember" },
    },
    {
      id: createId("quest"),
      key: "arc-ascension",
      chapter: 3,
      title: "Chapter 3 — Ascension",
      description: "Hold a 7-day streak. Consistency becomes character.",
      objectiveType: "streak-days",
      target: 7,
      progress: 0,
      completed: false,
      claimed: false,
      reward: { coins: 40, exp: 200, unlockThemeId: "theme_aurora" },
    },
  ];
}

export function createSeasonPass(monthKey = getStartOfCurrentMonthKey()): SeasonPassState {
  return {
    seasonKey: monthKey.slice(0, 7),
    xp: 0,
    level: 1,
    claimedLevels: [],
    rewards: [
      { level: 2, coins: 8, exp: 40, label: "Season spark" },
      { level: 3, coins: 12, exp: 60, label: "Momentum pack" },
      { level: 4, coins: 16, exp: 80, label: "Discipline cache" },
      { level: 5, coins: 24, exp: 120, label: "Season crest" },
      { level: 6, coins: 30, exp: 150, label: "Elite stipend" },
      { level: 7, coins: 40, exp: 200, label: "Season finale" },
    ],
  };
}

const BOSS_NAMES = [
  "Sloth Wraith",
  "Distraction Hydra",
  "Doomscroll Serpent",
  "Procrastination Golem",
  "Chaos Imp",
];

export function createWeeklyBoss(weekKey = getStartOfCurrentWeekKey()): WeeklyBossState {
  const index = Math.abs(
    weekKey.split("-").reduce((sum, part) => sum + Number(part), 0),
  ) % BOSS_NAMES.length;

  return {
    weekKey,
    name: BOSS_NAMES[index] ?? "Sloth Wraith",
    maxHp: 120,
    currentHp: 120,
    defeated: false,
    rewardClaimed: false,
    settledThroughDate: null,
  };
}

export function rollCrit(random = Math.random()) {
  return random < CRIT_CHANCE;
}

/** Stable 0..1 from a string (FNV-1a) so crit can't be farmed via undo/redo. */
function unitIntervalFromSeed(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}

/** Crit outcome is fixed per habit + day — re-completing after undo keeps the same roll. */
export function rollCritForHabit(habitId: string, dateKey: string) {
  return rollCrit(unitIntervalFromSeed(`crit:${habitId}:${dateKey}`));
}

export function decrementCombo(systems: RewardSystems, today = getTodayDateKey()) {
  if (systems.comboDate !== today || systems.todayCombo <= 0) {
    return systems;
  }

  const nextCombo = systems.todayCombo - 1;
  if (nextCombo <= 0) {
    return {
      ...systems,
      todayCombo: 0,
      comboDate: null,
    };
  }

  return {
    ...systems,
    todayCombo: nextCombo,
  };
}

/** Keep combo in lockstep with today's clears (fixes stale x20 from prior days). */
export function reconcileTodayCombo(
  systems: RewardSystems,
  completions: HabitQuestData["completions"],
  today = getTodayDateKey(),
): RewardSystems {
  const clearsToday = completions.filter((completion) => completion.date === today).length;
  if (clearsToday <= 0) {
    if (systems.todayCombo === 0 && systems.comboDate == null) {
      return systems;
    }
    return {
      ...systems,
      todayCombo: 0,
      comboDate: null,
    };
  }

  if (systems.comboDate === today && systems.todayCombo === clearsToday) {
    return systems;
  }

  return {
    ...systems,
    comboDate: today,
    todayCombo: clearsToday,
  };
}

export function getBossDamage(difficulty: HabitDifficulty) {
  return BOSS_DAMAGE[difficulty];
}

export function applyCritMultiplier(baseExp: number, isCrit: boolean) {
  return isCrit ? Math.round(baseExp * CRIT_MULTIPLIER) : baseExp;
}

export function reconcileStreakShields(
  systems: RewardSystems,
  completions: HabitCompletion[],
  today = getTodayDateKey(),
): { systems: RewardSystems; freezeUsed: boolean; protectedDate: string | null } {
  const completionDates = Array.from(new Set(completions.map((entry) => entry.date))).sort();
  const lastCompleted = completionDates[completionDates.length - 1] ?? null;

  if (!lastCompleted) {
    return { systems, freezeUsed: false, protectedDate: null };
  }

  const gap = getDaysBetween(lastCompleted, today);
  if (gap !== 2 || systems.streakFreezes <= 0) {
    return { systems, freezeUsed: false, protectedDate: null };
  }

  const missedDate = shiftDateKey(lastCompleted, 1);
  if (systems.streakShieldDates.includes(missedDate) || systems.lastFreezeUsedDate === missedDate) {
    return { systems, freezeUsed: false, protectedDate: null };
  }

  return {
    systems: {
      ...systems,
      streakFreezes: systems.streakFreezes - 1,
      streakShieldDates: [...systems.streakShieldDates, missedDate],
      lastFreezeUsedDate: missedDate,
    },
    freezeUsed: true,
    protectedDate: missedDate,
  };
}

export function getActiveShieldDates(systems: RewardSystems) {
  return systems.streakShieldDates.filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry));
}

export function maybeGrantStreakFreeze(
  systems: RewardSystems,
  currentStreak: number,
): { systems: RewardSystems; granted: boolean } {
  const grantMarker = `grant-${currentStreak}`;
  if (
    STREAK_FREEZE_MILESTONES.includes(currentStreak) &&
    systems.streakFreezes < MAX_STREAK_FREEZES &&
    !systems.streakShieldDates.includes(grantMarker)
  ) {
    return {
      systems: {
        ...systems,
        streakFreezes: Math.min(MAX_STREAK_FREEZES, systems.streakFreezes + 1),
        streakShieldDates: [...systems.streakShieldDates, grantMarker],
      },
      granted: true,
    };
  }

  return { systems, granted: false };
}

export function maybeApplyComeback(
  systems: RewardSystems,
  completions: HabitCompletion[],
  today = getTodayDateKey(),
): { systems: RewardSystems; triggered: boolean; coins: number; exp: number } {
  const dates = Array.from(new Set(completions.map((entry) => entry.date))).sort();
  const previous = dates.filter((date) => date < today).at(-1);
  if (!previous) {
    return { systems, triggered: false, coins: 0, exp: 0 };
  }

  const gap = getDaysBetween(previous, today);
  if (gap < COMEBACK_MIN_GAP_DAYS) {
    return { systems, triggered: false, coins: 0, exp: 0 };
  }

  if (systems.lastComebackDate && getDaysBetween(systems.lastComebackDate, today) < 7) {
    return { systems, triggered: false, coins: 0, exp: 0 };
  }

  return {
    systems: {
      ...systems,
      lastComebackDate: today,
    },
    triggered: true,
    coins: COMEBACK_COINS,
    exp: COMEBACK_EXP,
  };
}

export function updateCombo(systems: RewardSystems, today = getTodayDateKey()) {
  if (systems.comboDate === today) {
    return {
      ...systems,
      todayCombo: systems.todayCombo + 1,
    };
  }

  return {
    ...systems,
    comboDate: today,
    todayCombo: 1,
  };
}

export function syncQuestArcs(
  arcs: QuestArc[],
  data: HabitQuestData,
  throughDate: string | null = null,
): QuestArc[] {
  const completions = throughDate
    ? data.completions.filter((completion) => completion.date <= throughDate)
    : data.completions;

  const hardCompletions = completions.filter((completion) => {
    const habit = data.habits.find((entry) => entry.id === completion.habitId);
    return habit?.difficulty === "hard";
  }).length;

  const streakReference = throughDate ?? getTodayDateKey();
  const settledStreak = getStreakStats(
    completions,
    streakReference,
    getActiveShieldDates(data.rewardSystems),
  ).currentStreak;

  return arcs.map((arc) => {
    if (arc.claimed) {
      return arc;
    }

    let progress = arc.progress;
    if (arc.objectiveType === "habit-completions") {
      progress = completions.length;
    } else if (arc.objectiveType === "hard-completions") {
      progress = hardCompletions;
    } else {
      progress = settledStreak;
    }

    progress = Math.min(progress, arc.target);
    const completed = progress >= arc.target;

    return {
      ...arc,
      progress,
      completed,
    };
  });
}

export function getActiveQuestArc(arcs: QuestArc[]) {
  return arcs.find((arc) => !arc.claimed) ?? arcs[arcs.length - 1] ?? null;
}

export function reconcileSeasonPass(pass: SeasonPassState, monthKey = getStartOfCurrentMonthKey()) {
  const seasonKey = monthKey.slice(0, 7);
  if (pass.seasonKey === seasonKey) {
    return pass;
  }
  return createSeasonPass(monthKey);
}

export function addSeasonPassXp(pass: SeasonPassState, amount: number) {
  const nextXp = pass.xp + amount;
  const level = Math.max(1, Math.floor(nextXp / SEASON_PASS_XP_PER_LEVEL) + 1);
  return {
    ...pass,
    xp: nextXp,
    level,
  };
}

export function reconcileWeeklyBoss(boss: WeeklyBossState, weekKey = getStartOfCurrentWeekKey()) {
  if (boss.weekKey === weekKey) {
    return {
      ...boss,
      settledThroughDate: boss.settledThroughDate ?? null,
    };
  }
  return createWeeklyBoss(weekKey);
}

export function applyBossDamage(boss: WeeklyBossState, damage: number) {
  if (boss.defeated || damage <= 0) {
    return { boss, defeatedNow: false };
  }

  const currentHp = Math.max(0, boss.currentHp - damage);
  const defeated = currentHp <= 0;
  return {
    boss: {
      ...boss,
      currentHp,
      defeated,
    },
    defeatedNow: defeated && !boss.defeated,
  };
}

export function getBossDamageForDate(
  data: Pick<HabitQuestData, "habits" | "completions">,
  dateKey: string,
) {
  return data.completions.reduce((sum, completion) => {
    if (completion.date !== dateKey) {
      return sum;
    }
    const habit = data.habits.find((entry) => entry.id === completion.habitId);
    if (!habit) {
      return sum;
    }
    return sum + getBossDamage(habit.difficulty);
  }, 0);
}

export function getPendingBossDamage(
  data: Pick<HabitQuestData, "habits" | "completions">,
  today = getTodayDateKey(),
) {
  return getBossDamageForDate(data, today);
}

export function getEffectiveBossHp(
  boss: WeeklyBossState,
  pendingDamage: number,
) {
  return Math.max(0, boss.currentHp - Math.max(0, pendingDamage));
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

function rebuildCommittedBossHp(
  boss: WeeklyBossState,
  data: Pick<HabitQuestData, "habits" | "completions">,
  committedThrough: string | null,
) {
  if (!committedThrough || committedThrough < boss.weekKey) {
    return {
      ...boss,
      currentHp: boss.maxHp,
      defeated: false,
      settledThroughDate: null,
    };
  }

  const committedDamage = eachDateInclusive(boss.weekKey, committedThrough).reduce(
    (sum, dateKey) => sum + getBossDamageForDate(data, dateKey),
    0,
  );
  const currentHp = Math.max(0, boss.maxHp - committedDamage);

  return {
    ...boss,
    currentHp,
    defeated: currentHp <= 0,
    settledThroughDate: committedThrough,
  };
}

/**
 * Commits boss damage for finished calendar days only.
 * Today's clears stay as reversible pending damage until the next day resolves.
 */
export function settleWeeklyBossDamage(
  boss: WeeklyBossState,
  data: Pick<HabitQuestData, "habits" | "completions">,
  today = getTodayDateKey(),
) {
  let nextBoss = reconcileWeeklyBoss(boss);
  const yesterday = shiftDateKey(today, -1);
  const committedThrough =
    yesterday >= nextBoss.weekKey ? yesterday : null;

  // Migration / first settle: rebuild from weekStart..yesterday so old instant
  // damage is not double-counted when switching to end-of-day settlement.
  if (nextBoss.settledThroughDate == null) {
    const migrated = rebuildCommittedBossHp(nextBoss, data, committedThrough);
    const defeatedNow = migrated.defeated && !nextBoss.defeated;
    return { boss: migrated, defeatedNow };
  }

  if (!committedThrough) {
    return { boss: nextBoss, defeatedNow: false };
  }

  const settleStart = shiftDateKey(nextBoss.settledThroughDate, 1);
  const rangeStart = settleStart < nextBoss.weekKey ? nextBoss.weekKey : settleStart;
  if (rangeStart > committedThrough) {
    return { boss: nextBoss, defeatedNow: false };
  }

  let defeatedNow = false;
  for (const dateKey of eachDateInclusive(rangeStart, committedThrough)) {
    const hit = applyBossDamage(nextBoss, getBossDamageForDate(data, dateKey));
    nextBoss = {
      ...hit.boss,
      settledThroughDate: dateKey,
    };
    if (hit.defeatedNow) {
      defeatedNow = true;
    }
  }

  return { boss: nextBoss, defeatedNow };
}

export function createCelebration(
  kind: CelebrationEvent["kind"],
  title: string,
  description: string,
): CelebrationEvent {
  return {
    id: createId("cele"),
    kind,
    title,
    description,
  };
}

export function isStreakMilestone(streak: number) {
  return STREAK_MILESTONES.includes(streak);
}

export function getWeeklyRecap(data: HabitQuestData) {
  const weekStart = getStartOfCurrentWeekKey();
  const weekCompletions = data.completions.filter(
    (completion) => getDaysBetween(weekStart, completion.date) >= 0,
  );
  const exp = weekCompletions.reduce(
    (sum, completion) => sum + completion.expEarned + completion.streakBonusExp,
    0,
  );
  const hardClears = weekCompletions.filter((completion) => {
    const habit = data.habits.find((entry) => entry.id === completion.habitId);
    return habit?.difficulty === "hard";
  }).length;

  return {
    weekStart,
    completions: weekCompletions.length,
    exp,
    hardClears,
    streak: data.userProgress.currentStreak,
    bossDamageDealt:
      data.weeklyBoss.maxHp -
      getEffectiveBossHp(data.weeklyBoss, getPendingBossDamage(data)),
  };
}

function shiftDateKey(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function countHardCompletions(habits: Habit[], completions: HabitCompletion[]) {
  return completions.filter((completion) => {
    const habit = habits.find((entry) => entry.id === completion.habitId);
    return habit?.difficulty === "hard";
  }).length;
}
