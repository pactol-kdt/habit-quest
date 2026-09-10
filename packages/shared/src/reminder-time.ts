/** Default daily digest time (player-local clock). */
export const DEFAULT_REMINDER_LOCAL_TIME = "08:00";

/** Hours after the digest for the still-due follow-up push. */
export const FOLLOW_UP_OFFSET_HOURS = 14;

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

/** Snap to the top of the hour (`HH:00`) for the settings picker + hourly cron. */
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

/** Player-facing clock label, e.g. `8:00 AM`. */
export function formatReminderClockLabel(hhmm: string) {
  const normalized = normalizeReminderTime(hhmm);
  const [hourRaw, minuteRaw] = normalized.split(":");
  const stamp = new Date(2000, 0, 1, Number(hourRaw), Number(minuteRaw), 0);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(stamp);
}

export function describeReminderSchedule(reminderTime?: string | null) {
  const digestTime = normalizeReminderTime(reminderTime);
  const followUpTime = addHoursToReminderTime(digestTime, FOLLOW_UP_OFFSET_HOURS);
  return `around ${formatReminderClockLabel(digestTime)}, then a follow-up around ${formatReminderClockLabel(followUpTime)} if anything is still due`;
}
