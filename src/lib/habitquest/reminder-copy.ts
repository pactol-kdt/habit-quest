export function buildDailyReminderCopy(
  displayName: string,
  dueCount: number,
  stackHint?: string | null,
) {
  const name = displayName.trim() || "Adventurer";
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
    title: "Rise, adventurer",
    body:
      dueCount > 0
        ? `${name}, ${dueCount} habit${dueCount === 1 ? "" : "s"} await your return.`
        : `${name}, the path is open. One step keeps the streak.`,
  };
}

export function buildHabitCueReminderCopy(
  displayName: string,
  habitTitle: string,
  stackLine?: string | null,
) {
  const name = displayName.trim() || "Adventurer";
  return {
    title: stackLine ? "Stack trigger" : "Habit trigger",
    body: stackLine
      ? `${name}: ${stackLine}`
      : `${name}: time for ${habitTitle}.`,
  };
}
