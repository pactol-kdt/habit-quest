/** Fixed daily digest time for habits without a cue (player-local clock). */
export const DEFAULT_REMINDER_LOCAL_TIME = "06:00";

/**
 * Normalize to `HH:mm`. Invalid values fall back to `fallback`.
 */
export function normalizeReminderTime(
  value: string | null | undefined,
  fallback = DEFAULT_REMINDER_LOCAL_TIME,
): string {
  if (!value || typeof value !== "string") {
    return fallback;
  }

  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!match) {
    return fallback;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return fallback;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Snap to the top of the hour (`HH:00`) for hourly cron matching. */
export function snapReminderTimeToHour(
  value: string | null | undefined,
  fallback = DEFAULT_REMINDER_LOCAL_TIME,
): string {
  const normalized = normalizeReminderTime(value, fallback);
  return `${normalized.slice(0, 2)}:00`;
}

export function addHoursToReminderTime(hhmm: string, hours: number): string {
  const normalized = normalizeReminderTime(hhmm);
  const [hourRaw, minuteRaw] = normalized.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const dayMinutes = 24 * 60;
  const total =
    (((hour * 60 + minute + Math.trunc(hours) * 60) % dayMinutes) + dayMinutes) % dayMinutes;
  const nextHour = Math.floor(total / 60);
  const nextMinute = total % 60;
  return `${String(nextHour).padStart(2, "0")}:${String(nextMinute).padStart(2, "0")}`;
}

/** Player-facing clock label, e.g. `6:00 AM`. */
export function formatReminderClockLabel(hhmm: string) {
  const normalized = normalizeReminderTime(hhmm);
  const [hourRaw, minuteRaw] = normalized.split(":");
  const stamp = new Date(2000, 0, 1, Number(hourRaw), Number(minuteRaw), 0);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(stamp);
}

export const REMINDER_NUDGE_TIMING = "These are your reminder times.";

export const REMINDER_STAYS_QUIET = "Stays quiet until you turn reminders on.";

export type ReminderBuzzHabit = {
  title: string;
  cueTime?: string | null;
};

export type ReminderBuzzLine = {
  hour: number;
  kind: "cue" | "digest";
  label: string;
  detail: string;
};

/**
 * Buzz times for the player's habits. Same-hour cues share one line.
 * Habits with no time share the fixed 6:00 AM digest, and only then.
 */
export function buildReminderBuzzLines(
  habits: readonly ReminderBuzzHabit[],
): ReminderBuzzLine[] {
  const groups = new Map<number, Array<{ title: string; minutes: number }>>();
  let hasUntimed = false;

  for (const habit of habits) {
    const clock = normalizeReminderTime(habit.cueTime, "");
    const title = habit.title.trim() || "Untitled";
    if (!clock) {
      hasUntimed = true;
      continue;
    }
    const hour = Number(clock.slice(0, 2));
    const minutes = Number(clock.slice(3, 5));
    const names = groups.get(hour) ?? [];
    names.push({ title, minutes });
    groups.set(hour, names);
  }

  const lines: ReminderBuzzLine[] = [...groups.entries()]
    .sort(([left], [right]) => left - right)
    .map(([hour, names]) => ({
      hour,
      kind: "cue" as const,
      label: formatReminderClockLabel(`${String(hour).padStart(2, "0")}:00`),
      detail: names
        .sort((left, right) => left.minutes - right.minutes || left.title.localeCompare(right.title))
        .map((name) => name.title)
        .join(", "),
    }));

  if (hasUntimed) {
    const digestHour = Number(DEFAULT_REMINDER_LOCAL_TIME.slice(0, 2));
    lines.push({
      hour: digestHour,
      kind: "digest",
      label: formatReminderClockLabel(DEFAULT_REMINDER_LOCAL_TIME),
      detail: "habits with no time",
    });
    lines.sort((left, right) => left.hour - right.hour || (left.kind === "digest" ? 1 : -1));
  }

  return lines;
}

/** Joined buzz lines, or null when the player has no habits yet. */
export function formatReminderBuzzSummary(habits: readonly ReminderBuzzHabit[]) {
  const lines = buildReminderBuzzLines(habits);
  if (!lines.length) {
    return null;
  }
  return lines.map((line) => `${line.label} — ${line.detail}`).join("; ");
}
