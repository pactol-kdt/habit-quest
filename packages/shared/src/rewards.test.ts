import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createDefaultRewardSystems,
  getActiveShieldDates,
  mergeRewardFreezeState,
  reconcileStreakShields,
} from "./rewards.ts";
import { getStreakStats } from "./utils.ts";
import type { HabitCompletion } from "./types.ts";

function makeCompletion(date: string): HabitCompletion {
  return {
    id: `c_${date}`,
    habitId: "habit_1",
    date,
    expEarned: 10,
    streakBonusExp: 0,
    completedAt: `${date}T12:00:00.000Z`,
  };
}

function eachDate(start: string, end: string) {
  const dates: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    dates.push(cursor);
    const date = new Date(`${cursor}T12:00:00`);
    date.setDate(date.getDate() + 1);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    cursor = `${year}-${month}-${day}`;
  }
  return dates;
}

describe("reconcileStreakShields", () => {
  it("counts 10 days + one freeze + 10 days as a 21-day streak after a return-day clear", () => {
    const completions = [
      ...eachDate("2026-09-01", "2026-09-10"),
      ...eachDate("2026-09-12", "2026-09-21"),
    ].map(makeCompletion);

    const result = reconcileStreakShields(
      { ...createDefaultRewardSystems(), streakFreezes: 1 },
      completions,
      "2026-09-21",
    );

    assert.equal(result.freezeUsed, true);
    assert.equal(result.protectedDate, "2026-09-11");
    assert.equal(
      getStreakStats(completions, "2026-09-21", getActiveShieldDates(result.systems)).currentStreak,
      21,
    );
  });

  it("still protects yesterday when you have not cleared today yet", () => {
    const completions = eachDate("2026-09-01", "2026-09-10").map(makeCompletion);
    const result = reconcileStreakShields(
      { ...createDefaultRewardSystems(), streakFreezes: 1 },
      completions,
      "2026-09-12",
    );
    assert.equal(result.protectedDate, "2026-09-11");
    assert.equal(result.systems.streakFreezes, 0);
  });

  it("does not spend a freeze across a two-day miss", () => {
    const completions = [
      ...eachDate("2026-09-01", "2026-09-10"),
      ...eachDate("2026-09-13", "2026-09-21"),
    ].map(makeCompletion);
    const result = reconcileStreakShields(
      { ...createDefaultRewardSystems(), streakFreezes: 1 },
      completions,
      "2026-09-21",
    );
    assert.equal(result.freezeUsed, false);
    assert.equal(
      getStreakStats(completions, "2026-09-21", getActiveShieldDates(result.systems)).currentStreak,
      9,
    );
  });

  it("restores a dropped shield date without charging another freeze", () => {
    const completions = [
      ...eachDate("2026-09-01", "2026-09-10"),
      ...eachDate("2026-09-12", "2026-09-21"),
    ].map(makeCompletion);
    const result = reconcileStreakShields(
      {
        ...createDefaultRewardSystems(),
        streakFreezes: 0,
        streakShieldDates: [],
        lastFreezeUsedDate: "2026-09-11",
      },
      completions,
      "2026-09-21",
    );
    assert.equal(result.freezeUsed, false);
    assert.equal(result.systems.streakFreezes, 0);
    assert.ok(result.systems.streakShieldDates.includes("2026-09-11"));
  });
});

describe("mergeRewardFreezeState", () => {
  it("keeps a local freeze spend instead of resurrecting the unused cloud freeze", () => {
    const local = {
      ...createDefaultRewardSystems(),
      streakFreezes: 0,
      streakShieldDates: ["2026-09-11"],
      lastFreezeUsedDate: "2026-09-11",
    };
    const cloud = createDefaultRewardSystems();
    const merged = mergeRewardFreezeState(local, cloud);
    assert.equal(merged.streakFreezes, 0);
    assert.ok(merged.streakShieldDates.includes("2026-09-11"));
    assert.equal(merged.lastFreezeUsedDate, "2026-09-11");
  });
});
