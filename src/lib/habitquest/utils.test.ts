import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSeedData } from "./seed.ts";
import {
  calculateChallengeProgress,
  getPeriodStreakDays,
  isHabitDueOnDate,
  reconcileChallenges,
  removeCompletionsFromProgress,
} from "./utils.ts";
import type { Challenge, Habit, HabitCompletion, ExpHistoryEntry } from "../../types/habitquest.ts";

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "habit_1",
    title: "Morning stretch",
    description: "",
    difficulty: "easy",
    recurrence: "weekly",
    customDays: [1],
    createdAt: "2026-01-05T12:00:00.000Z",
    updatedAt: "2026-01-05T12:00:00.000Z",
    ...overrides,
  };
}

describe("weekly recurrence", () => {
  it("is weekday-based instead of every 7 days from creation", () => {
    const habit = makeHabit({ customDays: [1] });
    assert.equal(isHabitDueOnDate(habit, "2026-01-05"), true);
    assert.equal(isHabitDueOnDate(habit, "2026-01-06"), false);
    assert.equal(isHabitDueOnDate(habit, "2026-01-12"), true);
  });
});

describe("streak-days challenges", () => {
  it("uses consecutive days in the challenge window, not all-time best streak", () => {
    const completions: HabitCompletion[] = [
      {
        id: "c1",
        habitId: "habit_1",
        date: "2026-01-01",
        expEarned: 10,
        streakBonusExp: 0,
        completedAt: "2026-01-01T12:00:00.000Z",
      },
      {
        id: "c2",
        habitId: "habit_1",
        date: "2026-01-02",
        expEarned: 10,
        streakBonusExp: 0,
        completedAt: "2026-01-02T12:00:00.000Z",
      },
      {
        id: "c3",
        habitId: "habit_1",
        date: "2026-01-05",
        expEarned: 10,
        streakBonusExp: 0,
        completedAt: "2026-01-05T12:00:00.000Z",
      },
      {
        id: "c4",
        habitId: "habit_1",
        date: "2026-01-06",
        expEarned: 10,
        streakBonusExp: 0,
        completedAt: "2026-01-06T12:00:00.000Z",
      },
      {
        id: "c5",
        habitId: "habit_1",
        date: "2026-01-07",
        expEarned: 10,
        streakBonusExp: 0,
        completedAt: "2026-01-07T12:00:00.000Z",
      },
    ];

    assert.equal(getPeriodStreakDays(completions, "2026-01-05", "2026-01-11"), 3);

    const data = createSeedData();
    data.completions = completions;
    data.userProgress.bestStreak = 99;

    const challenge: Challenge = {
      id: "challenge_1",
      key: "weekly-streak",
      title: "Streak Keeper",
      description: "",
      period: "weekly",
      type: "streak-days",
      target: 5,
      progress: 0,
      completed: false,
      claimed: false,
      startsAt: "2026-01-05",
      endsAt: "2026-01-11",
      reward: { coins: 15, exp: 100, titleItemId: null },
    };

    const progressed = calculateChallengeProgress(challenge, data, new Date(2026, 0, 7));
    assert.equal(progressed.progress, 3);
    assert.equal(progressed.completed, false);
  });
});

describe("challenge rollover", () => {
  it("queues auto-claim for completed unclaimed challenges when the period rolls", () => {
    const data = createSeedData();
    const staleChallenge: Challenge = {
      id: "challenge_stale",
      key: "weekly-contract",
      title: "Weekly Contract",
      description: "Complete 15 habits this week.",
      period: "weekly",
      type: "habit-completions",
      target: 15,
      progress: 15,
      completed: true,
      claimed: false,
      startsAt: "2020-01-06",
      endsAt: "2020-01-12",
      reward: { coins: 20, exp: 150, titleItemId: null },
    };

    const result = reconcileChallenges([staleChallenge], data, new Date(2026, 0, 7));
    assert.equal(result.autoClaims.length, 1);
    assert.equal(result.autoClaims[0]?.key, staleChallenge.key);
    assert.notEqual(result.challenges[0]?.startsAt, "2020-01-06");
  });
});

describe("completion cleanup", () => {
  it("removes matching habit completions and related EXP without wiping unrelated history", () => {
    const data = createSeedData();
    const habit = data.habits[0]!;
    data.completions = [
      {
        id: "c_old",
        habitId: habit.id,
        date: "2026-01-01",
        expEarned: 10,
        streakBonusExp: 0,
        completedAt: "2026-01-01T12:00:00.000Z",
      },
      {
        id: "c_today",
        habitId: habit.id,
        date: "2026-01-07",
        expEarned: 10,
        streakBonusExp: 20,
        completedAt: "2026-01-07T12:00:00.000Z",
      },
    ];
    data.userProgress.totalExp = 40;
    data.userProgress.totalCompletedHabits = 2;
    data.userProgress.expHistory = [
      {
        id: "exp_1",
        date: "2026-01-01",
        amount: 10,
        source: "habit",
        label: `${habit.title} completed`,
      },
      {
        id: "exp_2",
        date: "2026-01-07",
        amount: 10,
        source: "habit",
        label: `${habit.title} completed`,
      },
      {
        id: "exp_3",
        date: "2026-01-07",
        amount: 20,
        source: "streak",
        label: "3-day streak bonus",
      },
      {
        id: "exp_4",
        date: "2026-01-07",
        amount: 50,
        source: "achievement",
        label: "First Habit Completed",
      },
    ];

    const next = removeCompletionsFromProgress(
      data,
      [data.completions[1]!],
      new Map([[habit.id, habit.title]]),
    );

    assert.equal(next.completions.length, 1);
    assert.equal(next.completions[0]?.id, "c_old");
    assert.equal(next.userProgress.totalExp, 10);
    assert.equal(next.userProgress.expHistory.some((entry: ExpHistoryEntry) => entry.id === "exp_2"), false);
    assert.equal(next.userProgress.expHistory.some((entry: ExpHistoryEntry) => entry.id === "exp_3"), false);
    assert.equal(next.userProgress.expHistory.some((entry: ExpHistoryEntry) => entry.id === "exp_1"), true);
    assert.equal(next.userProgress.expHistory.some((entry: ExpHistoryEntry) => entry.id === "exp_4"), true);
  });
});
