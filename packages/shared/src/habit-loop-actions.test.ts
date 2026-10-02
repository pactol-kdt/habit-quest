import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyCompleteHabitForToday,
  applyUncompleteHabitForToday,
} from "./habit-mutations.ts";
import { getSeasonXpForCompletion, getEffectiveUserProgress, settleHabitDayProgress } from "./day-settlement.ts";
import { createSeedData } from "./seed.ts";
import { getDifficultyExp, getMinimumCompletionExp, getWeeklyCompletionCapacity, hasCompletionForDate } from "./utils.ts";
import { syncQuestArcs } from "./rewards.ts";
import { normalizeCompletionRecord, shouldOfferReflection } from "./reflection.ts";
import { buildWeeklyReview } from "./weekly-review.ts";
import type { Habit, HabitCompletion, HabitQuestData } from "./types.ts";

function finish(data: HabitQuestData, habitId: string, date: string, minimum = false) {
  const result = applyCompleteHabitForToday(data, habitId, date, { minimum });
  assert.equal(result.ok, true);
  if (!result.ok || !result.completion) {
    throw new Error("expected completion");
  }
  return result;
}

describe("minimum completion", () => {
  it("counts as done with less level progress and no bonus roll", () => {
    const data = createSeedData();
    const habit = data.habits[0]!;
    habit.difficulty = "medium";
    const today = "2026-10-02";

    const minimum = finish(data, habit.id, today, true);
    assert.equal(minimum.completion.minimum, true);
    assert.equal(minimum.completion.crit, undefined);
    assert.equal(minimum.completion.expEarned, getMinimumCompletionExp("medium"));
    assert.ok(minimum.completion.expEarned < getDifficultyExp("medium"));
    assert.equal(hasCompletionForDate(minimum.data.completions, habit.id, today), true);

    const progress = getEffectiveUserProgress(minimum.data, today);
    assert.equal(progress.currentStreak, 1);

    const full = finish(data, habit.id, today, false);
    assert.ok(full.completion.expEarned >= getDifficultyExp("medium"));
    assert.ok(
      getSeasonXpForCompletion(minimum.completion.expEarned, true) <
        getSeasonXpForCompletion(full.completion.expEarned, Boolean(full.completion.minimum)),
    );
  });

  it("undo restores the pre-clear wallet of level progress", () => {
    const data = createSeedData();
    const habitId = data.habits[0]!.id;
    data.rewardSystems = {
      ...data.rewardSystems,
      progressSettledThroughDate: "2026-10-01",
    };
    const today = "2026-10-02";
    const completed = finish(data, habitId, today, true);
    const settled = settleHabitDayProgress(completed.data, today);
    assert.ok(settled.data.userProgress.totalExp >= completed.completion.expEarned);

    const undone = applyUncompleteHabitForToday(settled.data, habitId, today);
    assert.equal(undone.ok, true);
    if (!undone.ok) {
      return;
    }
    const afterUndo = settleHabitDayProgress(undone.data, today);
    assert.equal(afterUndo.data.userProgress.totalExp, 0);
    assert.equal(hasCompletionForDate(afterUndo.data.completions, habitId, today), false);

    const redone = finish(afterUndo.data, habitId, today, false);
    assert.equal(redone.completion.minimum, undefined);
    assert.ok(redone.completion.expEarned >= getDifficultyExp(data.habits[0]!.difficulty));
  });

  it("rejects a minimum when the habit has no tiny version", () => {
    const data = createSeedData();
    const habit = data.habits[0]!;
    habit.tinyVersion = "";
    const result = applyCompleteHabitForToday(data, habit.id, "2026-10-02", { minimum: true });
    assert.equal(result.ok, false);
  });
});

describe("reflection prompts", () => {
  it("asks on the third finish when a desired feeling exists", () => {
    const habit = createSeedData().habits[0]!;
    const completions: HabitCompletion[] = [1, 2, 3].map((day) => ({
      id: `c${day}`,
      habitId: habit.id,
      date: `2026-10-0${day}`,
      expEarned: 10,
      streakBonusExp: 0,
      completedAt: `2026-10-0${day}T12:00:00.000Z`,
    }));
    assert.equal(shouldOfferReflection(completions.slice(0, 1), habit, completions[0]!), false);
    assert.equal(shouldOfferReflection(completions.slice(0, 2), habit, completions[1]!), false);
    assert.equal(shouldOfferReflection(completions, habit, completions[2]!), true);
    assert.equal(
      shouldOfferReflection(completions, habit, { ...completions[2]!, reflection: "fine" }),
      false,
    );
  });

  it("drops unknown reflection values from older saves", () => {
    const normalized = normalizeCompletionRecord({
      id: "c",
      habitId: "h",
      date: "2026-10-02",
      expEarned: 10,
      streakBonusExp: 0,
      completedAt: "2026-10-02T12:00:00.000Z",
      reflection: "nope" as HabitCompletion["reflection"],
      minimum: false,
    });
    assert.equal(normalized.reflection, undefined);
    assert.equal(normalized.minimum, undefined);
  });
});

describe("weekly review", () => {
  it("suggests a tiny version when a habit has been quiet", () => {
    const data = createSeedData();
    const habit: Habit = {
      ...data.habits[0]!,
      tinyVersion: "",
      recurrence: "daily",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    data.habits = [habit];
    data.completions = [];
    const review = buildWeeklyReview(data, "2026-10-02");
    const insight = review.insights.find((entry) => entry.habitId === habit.id);
    assert.ok(insight);
    assert.equal(insight?.action, "add-tiny");
    assert.equal("score" in (insight ?? {}), false);
  });

  it("notices frequent minimum finishes without calling them a failure", () => {
    const data = createSeedData();
    const habit = {
      ...data.habits[0]!,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    data.habits = [habit];
    data.completions = Array.from({ length: 14 }, (_, index) => {
      const date = new Date("2026-09-19T12:00:00");
      date.setDate(date.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      return {
        id: `c${index}`,
        habitId: habit.id,
        date: key,
        expEarned: 5,
        streakBonusExp: 0,
        completedAt: `${key}T12:00:00.000Z`,
        minimum: true as const,
      };
    });
    const review = buildWeeklyReview(data, "2026-10-02");
    const insight = review.insights.find((entry) => entry.id === `minimum:${habit.id}`);
    assert.ok(insight);
    assert.match(insight?.body ?? "", /still counts/i);
    assert.equal(insight?.action, "keep");
  });
});

describe("hard-habit quests", () => {
  it("counts a full hard clear and ignores a minimum clear", () => {
    const data = createSeedData();
    const habit = data.habits[1]!;
    assert.equal(habit.difficulty, "hard");
    const today = "2026-10-02";

    const minimum = finish(data, habit.id, today, true);
    const afterMinimum = syncQuestArcs(minimum.data.questArcs, minimum.data, today);
    assert.equal(
      afterMinimum.find((arc) => arc.objectiveType === "hard-completions")?.progress,
      0,
    );
    assert.equal(
      afterMinimum.find((arc) => arc.objectiveType === "habit-completions")?.progress,
      1,
    );

    const full = finish(minimum.data, habit.id, "2026-10-01", false);
    const afterFull = syncQuestArcs(full.data.questArcs, full.data, today);
    assert.equal(afterFull.find((arc) => arc.objectiveType === "hard-completions")?.progress, 1);
    assert.equal(afterFull.find((arc) => arc.objectiveType === "habit-completions")?.progress, 2);
  });
});

describe("reflection dismissal", () => {
  it("keeps dismissed on the completion and does not offer the prompt again", () => {
    const habit = createSeedData().habits[0]!;
    const completion: HabitCompletion = {
      id: "c1",
      habitId: habit.id,
      date: "2026-10-02",
      expEarned: 10,
      streakBonusExp: 0,
      completedAt: "2026-10-02T12:00:00.000Z",
      reflection: "dismissed",
    };
    const normalized = normalizeCompletionRecord({
      ...completion,
      reflection: "dismissed",
    });
    assert.equal(normalized.reflection, "dismissed");
    assert.equal(shouldOfferReflection([completion, completion, completion], habit, completion), false);
  });

  it("does not treat a dismissal as a feeling in the weekly review", () => {
    const data = createSeedData();
    const habit = {
      ...data.habits[0]!,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    data.habits = [habit];
    data.completions = ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01"].map((date, index) => ({
      id: `c${index}`,
      habitId: habit.id,
      date,
      expEarned: 10,
      streakBonusExp: 0,
      completedAt: `${date}T12:00:00.000Z`,
      reflection: "dismissed" as const,
    }));
    const review = buildWeeklyReview(data, "2026-10-02");
    assert.equal(review.insights.some((entry) => entry.id.startsWith("feeling:")), false);
  });
});

describe("weekly capacity", () => {
  it("counts one daily habit as seven clears in the current week", () => {
    const habit = {
      ...createSeedData().habits[0]!,
      recurrence: "daily" as const,
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    assert.equal(getWeeklyCompletionCapacity([habit], new Date(2026, 9, 2)), 7);
  });
});
