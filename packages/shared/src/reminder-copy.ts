export function buildDailyReminderCopy(
  displayName: string,
  dueCount: number,
  stackHint?: string | null,
) {
  const name = displayName.trim() || "Traveler";
  if (stackHint) {
    return {
      title: "Your stack is waiting",
      body:
        dueCount > 1
          ? `${name}: ${stackHint} · ${dueCount} habits due.`
          : `${name}: ${stackHint}`,
    };
  }
  return {
    title: "Time to clear",
    body:
      dueCount > 0
        ? `${name}, ${dueCount} habit${dueCount === 1 ? "" : "s"} ready — keep the streak.`
        : `${name}, one clear today keeps the journey going.`,
  };
}

export function buildHabitCueReminderCopy(
  displayName: string,
  habitTitle: string,
  stackLine?: string | null,
) {
  const name = displayName.trim() || "Traveler";
  return {
    title: stackLine ? "Stack trigger" : "Habit trigger",
    body: stackLine
      ? `${name}: ${stackLine}`
      : `${name}: time for ${habitTitle}.`,
  };
}

export type CueHourReminderHabit = {
  title: string;
  stackLine?: string | null;
};

function listHabitTitles(titles: string[]) {
  if (titles.length <= 1) {
    return titles[0] ?? "";
  }
  if (titles.length === 2) {
    return `${titles[0]} and ${titles[1]}`;
  }
  if (titles.length === 3) {
    return `${titles[0]}, ${titles[1]}, and ${titles[2]}`;
  }
  return `${titles[0]}, ${titles[1]}, and ${titles.length - 2} more`;
}

/** One payload for every incomplete habit whose cue falls in the same local hour. */
export function buildCueHourReminderCopy(
  displayName: string,
  habits: CueHourReminderHabit[],
) {
  if (habits.length === 1) {
    const only = habits[0]!;
    return buildHabitCueReminderCopy(displayName, only.title, only.stackLine);
  }

  const name = displayName.trim() || "Traveler";
  const titles = habits.map((habit) => habit.title.trim() || "habit");
  return {
    title: "Habits waiting",
    body: `${name}: ${listHabitTitles(titles)}.`,
  };
}
