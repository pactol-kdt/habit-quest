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

export function buildFollowUpReminderCopy(
  displayName: string,
  dueCount: number,
  stackHint?: string | null,
) {
  const name = displayName.trim() || "Traveler";
  if (stackHint) {
    return {
      title: "Still waiting",
      body:
        dueCount > 1
          ? `${name}: ${stackHint} · ${dueCount} still open.`
          : `${name}: ${stackHint}`,
    };
  }
  return {
    title: "Follow-up",
    body: `${name}, ${dueCount} habit${dueCount === 1 ? "" : "s"} still open — close the day.`,
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
