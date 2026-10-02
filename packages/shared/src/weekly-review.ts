import { WEEKDAY_LABELS } from "./constants";
import { isCompletionReflection } from "./reflection";
import { isHabitDueOnDate } from "./utils";
import type { HabitCompletion, HabitQuestData } from "./types";

export type WeeklyReviewAction =
  | "add-tiny"
  | "change-cue"
  | "change-schedule"
  | "change-stack"
  | "keep";

export interface WeeklyReviewInsight {
  id: string;
  habitId: string | null;
  title: string;
  body: string;
  action: WeeklyReviewAction;
  actionLabel: string;
}

export interface WeeklyReview {
  insights: WeeklyReviewInsight[];
  emptyMessage: string;
}

const WINDOW_DAYS = 14;
const MAX_INSIGHTS = 3;

function shiftDateKey(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function windowDates(today: string) {
  const dates: string[] = [];
  for (let offset = WINDOW_DAYS - 1; offset >= 0; offset -= 1) {
    dates.push(shiftDateKey(today, -offset));
  }
  return dates;
}

function weekdayIndex(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).getDay();
}

function completionsFor(completions: HabitCompletion[], habitId: string, dates: Set<string>) {
  return completions.filter((entry) => entry.habitId === habitId && dates.has(entry.date));
}

/**
 * A short review from real finishes. No score. At most a few calm suggestions.
 */
export function buildWeeklyReview(data: HabitQuestData, today: string): WeeklyReview {
  const dates = windowDates(today);
  const dateSet = new Set(dates);
  const insights: WeeklyReviewInsight[] = [];
  const usedHabits = new Set<string>();

  const habitStats = data.habits.map((habit) => {
    const dueDates = dates.filter((date) => isHabitDueOnDate(habit, date));
    const finishes = completionsFor(data.completions, habit.id, dateSet).filter((entry) =>
      dueDates.includes(entry.date),
    );
    const minimums = finishes.filter((entry) => entry.minimum).length;
    return {
      habit,
      dueDates,
      finishes,
      minimums,
      full: finishes.length - minimums,
      rate: dueDates.length ? finishes.length / dueDates.length : 0,
    };
  });

  for (const stat of habitStats) {
    if (stat.dueDates.length < 4 || stat.rate >= 0.4 || usedHabits.has(stat.habit.id)) {
      continue;
    }
    const hasTiny = Boolean(stat.habit.tinyVersion.trim());
    const stacked = Boolean(stat.habit.stackAfter.trim() || stat.habit.stackAfterHabitId);
    const action = !hasTiny ? "add-tiny" : stacked ? "change-stack" : "change-schedule";
    insights.push({
      id: `quiet:${stat.habit.id}`,
      habitId: stat.habit.id,
      title: `${stat.habit.title} has been quiet`,
      body: !hasTiny
        ? "A smaller version can keep it alive on hard days."
        : stacked
          ? "The link before it might be the hard part. You can change what it follows."
          : "The current days might be a tight fit. You can move them.",
      action,
      actionLabel: !hasTiny ? "Add tiny version" : stacked ? "Change stack" : "Change schedule",
    });
    usedHabits.add(stat.habit.id);
  }

  for (const stat of habitStats) {
    if (usedHabits.has(stat.habit.id) || stat.dueDates.length < 4) {
      continue;
    }
    const byWeekday = new Map<number, { due: number; done: number }>();
    for (const date of stat.dueDates) {
      const weekday = weekdayIndex(date);
      const bucket = byWeekday.get(weekday) ?? { due: 0, done: 0 };
      bucket.due += 1;
      if (stat.finishes.some((entry) => entry.date === date)) {
        bucket.done += 1;
      }
      byWeekday.set(weekday, bucket);
    }
    const slipped = [...byWeekday.entries()].find(([, bucket]) => bucket.due >= 2 && bucket.done === 0);
    const landedElsewhere = [...byWeekday.values()].some((bucket) => bucket.done > 0);
    if (!slipped || !landedElsewhere) {
      continue;
    }
    insights.push({
      id: `schedule:${stat.habit.id}`,
      habitId: stat.habit.id,
      title: `${stat.habit.title} is quiet on ${WEEKDAY_LABELS[slipped[0]]}`,
      body: "Those days might not be the right cue. You can move it.",
      action: "change-schedule",
      actionLabel: "Change schedule",
    });
    usedHabits.add(stat.habit.id);
  }

  for (const stat of habitStats) {
    if (usedHabits.has(stat.habit.id)) {
      continue;
    }
    if (stat.minimums < 2 || stat.minimums < stat.full) {
      continue;
    }
    insights.push({
      id: `minimum:${stat.habit.id}`,
      habitId: stat.habit.id,
      title: `${stat.habit.title} has mostly been the small version`,
      body: "That still counts. Keep the minimum, or make the full habit closer to it.",
      action: "keep",
      actionLabel: "Keep as is",
    });
    usedHabits.add(stat.habit.id);
  }

  const recentReflections = data.completions.filter(
    (entry) => dateSet.has(entry.date) && isCompletionReflection(entry.reflection),
  );
  const hardReflections = recentReflections.filter((entry) => entry.reflection === "hard");
  if (recentReflections.length >= 3 && hardReflections.length / recentReflections.length >= 0.6) {
    const byHabit = new Map<string, number>();
    for (const entry of hardReflections) {
      byHabit.set(entry.habitId, (byHabit.get(entry.habitId) ?? 0) + 1);
    }
    const hardest = [...byHabit.entries()].sort((left, right) => right[1] - left[1])[0];
    const habit = hardest ? data.habits.find((entry) => entry.id === hardest[0]) : undefined;
    if (habit && hardest && hardest[1] >= 2 && habit.cueTime && !usedHabits.has(habit.id)) {
      insights.push({
        id: `feeling:${habit.id}`,
        habitId: habit.id,
        title: `${habit.title} has felt hard afterward`,
        body: "You can shift when or where it happens. Or leave it.",
        action: "change-cue",
        actionLabel: "Change cue",
      });
      usedHabits.add(habit.id);
    } else {
      insights.push({
        id: "feeling:recent",
        habitId: null,
        title: "A few finishes felt hard",
        body: "That's useful to notice. Nothing has to change.",
        action: "keep",
        actionLabel: "Keep as is",
      });
    }
  }

  if (insights.length < 2) {
    for (const stat of habitStats) {
      if (insights.length >= MAX_INSIGHTS || usedHabits.has(stat.habit.id)) {
        continue;
      }
      if (!stat.habit.cueTime || stat.dueDates.length < 4 || stat.rate < 0.8) {
        continue;
      }
      insights.push({
        id: `cue:${stat.habit.id}`,
        habitId: stat.habit.id,
        title: `${stat.habit.title} shows up around ${stat.habit.cueTime}`,
        body: "That time seems to fit.",
        action: "keep",
        actionLabel: "Keep as is",
      });
      usedHabits.add(stat.habit.id);
      break;
    }
  }

  if (insights.length < 2) {
    for (const stat of habitStats) {
      if (insights.length >= MAX_INSIGHTS || usedHabits.has(stat.habit.id)) {
        continue;
      }
      const stacked = Boolean(stat.habit.stackAfter.trim() || stat.habit.stackAfterHabitId);
      if (!stacked || stat.dueDates.length < 4 || stat.rate < 0.75) {
        continue;
      }
      insights.push({
        id: `stack:${stat.habit.id}`,
        habitId: stat.habit.id,
        title: `Stacking ${stat.habit.title} is helping`,
        body: "The link to something you already do is holding.",
        action: "keep",
        actionLabel: "Keep as is",
      });
      usedHabits.add(stat.habit.id);
      break;
    }
  }

  const chosen = insights.slice(0, MAX_INSIGHTS);
  const hadAnyDue = habitStats.some((stat) => stat.dueDates.length > 0);
  return {
    insights: chosen,
    emptyMessage: hadAnyDue
      ? "Nothing to change. The list is the main thing."
      : "Finish a few habits and this review will have something quiet to say.",
  };
}

export function reviewOpensEasierSection(action: WeeklyReviewAction) {
  return action === "add-tiny" || action === "change-cue" || action === "change-stack";
}
