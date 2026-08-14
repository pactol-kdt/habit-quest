/** Fixed daily reminder: 08:00 in each user's local timezone. */
export const FIXED_REMINDER_LOCAL_TIME = "08:00";

export function getDateKeyInTimeZone(timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    return now.toISOString().slice(0, 10);
  }
  return `${year}-${month}-${day}`;
}

export function getClockMinutesInTimeZone(timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timeZone || "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  let hours = Number(parts.find((part) => part.type === "hour")?.value);
  const minutes = Number(parts.find((part) => part.type === "minute")?.value);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return now.getUTCHours() * 60 + now.getUTCMinutes();
  }
  // Some engines report midnight as 24.
  if (hours === 24) {
    hours = 0;
  }
  return hours * 60 + minutes;
}

function parseReminderMinutes(reminderTime: string) {
  const [hoursRaw, minutesRaw] = reminderTime.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
}

/** True once local time has reached the reminder minute (tab catch-up). */
export function shouldFireReminderInTimeZone(
  reminderTime: string,
  timeZone: string,
  now = new Date(),
) {
  const targetMinutes = parseReminderMinutes(reminderTime);
  if (targetMinutes === null) {
    return false;
  }
  return getClockMinutesInTimeZone(timeZone, now) >= targetMinutes;
}

/**
 * True only during the reminder's local hour (e.g. 08:00–08:59).
 * Used by hourly Vercel crons so each timezone fires near 8am, not all day.
 */
export function isWithinReminderHourInTimeZone(
  reminderTime: string,
  timeZone: string,
  now = new Date(),
) {
  const targetMinutes = parseReminderMinutes(reminderTime);
  if (targetMinutes === null) {
    return false;
  }
  const currentMinutes = getClockMinutesInTimeZone(timeZone, now);
  return currentMinutes >= targetMinutes && currentMinutes < targetMinutes + 60;
}
