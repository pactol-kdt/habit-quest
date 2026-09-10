import {
  DEFAULT_REMINDER_LOCAL_TIME,
  FOLLOW_UP_OFFSET_HOURS,
  addHoursToReminderTime,
  describeReminderSchedule,
  formatReminderClockLabel,
  normalizeReminderTime,
  snapReminderTimeToHour,
} from "@habitquest/shared";

/** @deprecated Prefer DEFAULT_REMINDER_LOCAL_TIME — kept for existing imports. */
export const FIXED_REMINDER_LOCAL_TIME = DEFAULT_REMINDER_LOCAL_TIME;

export {
  DEFAULT_REMINDER_LOCAL_TIME,
  FOLLOW_UP_OFFSET_HOURS,
  addHoursToReminderTime,
  describeReminderSchedule,
  formatReminderClockLabel,
  normalizeReminderTime,
  snapReminderTimeToHour,
};

export type PushSlotKind = "digest" | "followup";

export type ActiveLocalPushSlot = {
  kind: PushSlotKind;
  time: string;
  slotKey: string;
};

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
  const normalized = normalizeReminderTime(reminderTime, "");
  if (!normalized) {
    return null;
  }
  const [hoursRaw, minutesRaw] = normalized.split(":");
  return Number(hoursRaw) * 60 + Number(minutesRaw);
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
 * True only during the reminder's local hour window
 * (e.g. 08:00 → 08:00–08:59).
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

/**
 * Resolve the active digest / follow-up slot for a player's local reminder time.
 * Follow-up is digest + FOLLOW_UP_OFFSET_HOURS on the same local clock.
 */
export function getActiveLocalPushSlot(
  reminderTime: string,
  timeZone: string,
  now = new Date(),
): ActiveLocalPushSlot | null {
  const digest = normalizeReminderTime(reminderTime);
  const followUp = addHoursToReminderTime(digest, FOLLOW_UP_OFFSET_HOURS);
  const localDateKey = getDateKeyInTimeZone(timeZone || "UTC", now);

  if (isWithinReminderHourInTimeZone(digest, timeZone, now)) {
    return {
      kind: "digest",
      time: digest,
      slotKey: `${localDateKey}:d`,
    };
  }

  if (isWithinReminderHourInTimeZone(followUp, timeZone, now)) {
    return {
      kind: "followup",
      time: followUp,
      slotKey: `${localDateKey}:f`,
    };
  }

  return null;
}

/** Player-facing schedule from their chosen local time. Never mention UTC. */
export function describePushReminderSchedule(reminderTime?: string | null) {
  return describeReminderSchedule(reminderTime);
}

/**
 * Once-per-slot gate. Accepts:
 * - current keys: `YYYY-MM-DD:d` / `YYYY-MM-DD:f`
 * - legacy bare `YYYY-MM-DD` as digest for that date
 * - legacy UTC `YYYY-MM-DDTHH` exact match only
 */
export function hasSentPushSlot(lastSlot: string | null | undefined, slotKey: string) {
  if (!lastSlot) {
    return false;
  }
  if (lastSlot === slotKey) {
    return true;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(lastSlot) && slotKey === `${lastSlot}:d`) {
    return true;
  }
  return false;
}
