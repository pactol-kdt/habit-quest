/** In-tab digest fallback: 08:00 in the user's local timezone. */
export const FIXED_REMINDER_LOCAL_TIME = "08:00";

/** Background Web Push digest: 00:00 UTC (08:00 in UTC+8). */
export const FIXED_PUSH_UTC_TIME = "00:00";

/** Background Web Push follow-up: 14:00 UTC (22:00 in UTC+8). */
export const FOLLOW_UP_PUSH_UTC_TIME = "14:00";

export const PUSH_UTC_SLOTS = [
  { time: FIXED_PUSH_UTC_TIME, kind: "digest" as const },
  { time: FOLLOW_UP_PUSH_UTC_TIME, kind: "followup" as const },
] as const;

export type PushUtcSlotKind = (typeof PUSH_UTC_SLOTS)[number]["kind"];

export type ActivePushUtcSlot = {
  kind: PushUtcSlotKind;
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

export function getActivePushSlotUtc(now = new Date()): ActivePushUtcSlot | null {
  const dateKey = getDateKeyInTimeZone("UTC", now);
  for (const slot of PUSH_UTC_SLOTS) {
    if (isWithinReminderHourInTimeZone(slot.time, "UTC", now)) {
      return {
        kind: slot.kind,
        time: slot.time,
        slotKey: `${dateKey}T${slot.time.slice(0, 2)}`,
      };
    }
  }
  return null;
}

/** True during 00:00–00:59 or 14:00–14:59 UTC. */
export function isWithinPushHourUtc(now = new Date()) {
  return getActivePushSlotUtc(now) !== null;
}

function resolveTimeZone(timeZone?: string) {
  if (timeZone && timeZone.trim()) {
    return timeZone.trim();
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Clock label for a fixed UTC HH:mm slot, in the player's timezone. */
export function formatUtcHhMmInTimeZone(
  utcHHmm: string,
  timeZone?: string,
  now = new Date(),
) {
  const [hoursRaw, minutesRaw] = utcHHmm.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return utcHHmm;
  }

  const instant = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hours, minutes, 0),
  );

  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: resolveTimeZone(timeZone),
      hour: "numeric",
      minute: "2-digit",
    }).format(instant);
  } catch {
    return utcHHmm;
  }
}

export function getPushReminderLocalTimes(timeZone?: string, now = new Date()) {
  return {
    digest: formatUtcHhMmInTimeZone(FIXED_PUSH_UTC_TIME, timeZone, now),
    followUp: formatUtcHhMmInTimeZone(FOLLOW_UP_PUSH_UTC_TIME, timeZone, now),
  };
}

/** Player-facing schedule. Never mention UTC. */
export function describePushReminderSchedule(timeZone?: string, now = new Date()) {
  const { digest, followUp } = getPushReminderLocalTimes(timeZone, now);
  return `around ${digest}, then a follow-up around ${followUp} if anything is still due`;
}

/**
 * Once-per-slot gate. Legacy `YYYY-MM-DD` values count as the midnight digest
 * for that UTC day so a deploy does not double-send 00:00.
 */
export function hasSentPushSlot(lastSlot: string | null | undefined, slotKey: string) {
  if (!lastSlot) {
    return false;
  }
  if (lastSlot === slotKey) {
    return true;
  }
  const dateKey = slotKey.slice(0, 10);
  const hour = slotKey.slice(11);
  return lastSlot === dateKey && hour === "00";
}
