import {
  DEFAULT_REMINDER_LOCAL_TIME,
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
  addHoursToReminderTime,
  describeReminderSchedule,
  formatReminderClockLabel,
  normalizeReminderTime,
  snapReminderTimeToHour,
};

export type PushSlotKind = "digest" | "cue";

export type ActiveLocalPushSlot = {
  kind: PushSlotKind;
  time: string;
  slotKey: string;
};

export type CueLikeHabit = {
  id: string;
  cueTime?: string | null;
};

export type PlannedPushSlot = {
  kind: PushSlotKind;
  slotKey: string;
  hour: number;
  habitIds: string[];
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

/** Local clock hour 0–23. */
export function getLocalHourInTimeZone(timeZone: string, now = new Date()) {
  return Math.floor(getClockMinutesInTimeZone(timeZone, now) / 60);
}

/** @deprecated Prefer getLocalHourInTimeZone. */
export function getActiveCueHour(timeZone: string, now = new Date()) {
  return getLocalHourInTimeZone(timeZone, now);
}

function parseReminderMinutes(reminderTime: string) {
  const normalized = normalizeReminderTime(reminderTime, "");
  if (!normalized) {
    return null;
  }
  const [hoursRaw, minutesRaw] = normalized.split(":");
  return Number(hoursRaw) * 60 + Number(minutesRaw);
}

/** Hour 0–23 from `HH:mm`. Invalid / empty → null (not the digest default). */
export function hourFromClockTime(value: string | null | undefined): number | null {
  const normalized = normalizeReminderTime(value, "");
  if (!normalized) {
    return null;
  }
  const hour = Number(normalized.slice(0, 2));
  return Number.isFinite(hour) ? hour : null;
}

export function digestSlotKey(dateKey: string) {
  return `${dateKey}:d`;
}

export function cueSlotKey(dateKey: string, hour: number) {
  const wrapped = ((hour % 24) + 24) % 24;
  return `${dateKey}:c:${String(wrapped).padStart(2, "0")}`;
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
 * Digest slot for the player's Settings reminder hour. Cue hours are separate.
 */
export function getActiveLocalPushSlot(
  reminderTime: string,
  timeZone: string,
  now = new Date(),
): ActiveLocalPushSlot | null {
  const digest = snapReminderTimeToHour(reminderTime);
  const digestHour = hourFromClockTime(digest);
  if (digestHour === null) {
    return null;
  }
  if (getLocalHourInTimeZone(timeZone, now) !== digestHour) {
    return null;
  }
  const localDateKey = getDateKeyInTimeZone(timeZone || "UTC", now);
  return {
    kind: "digest",
    time: digest,
    slotKey: digestSlotKey(localDateKey),
  };
}

/**
 * Cue-hour batch + digest-for-uncued. Same-hour cues share one slot.
 * Digest only includes incomplete habits that have no cue time.
 */
export function resolvePushSlotsForHour(input: {
  incomplete: CueLikeHabit[];
  reminderTime: string;
  localDateKey: string;
  localHour: number;
}): PlannedPushSlot[] {
  const slots: PlannedPushSlot[] = [];
  const cued = input.incomplete.filter(
    (habit) => hourFromClockTime(habit.cueTime) === input.localHour,
  );
  if (cued.length) {
    slots.push({
      kind: "cue",
      slotKey: cueSlotKey(input.localDateKey, input.localHour),
      hour: input.localHour,
      habitIds: cued.map((habit) => habit.id),
    });
  }

  const digestHour = hourFromClockTime(snapReminderTimeToHour(input.reminderTime));
  if (digestHour !== input.localHour) {
    return slots;
  }

  const cuedIds = new Set(cued.map((habit) => habit.id));
  const uncued = input.incomplete.filter(
    (habit) => hourFromClockTime(habit.cueTime) === null && !cuedIds.has(habit.id),
  );
  if (uncued.length) {
    slots.push({
      kind: "digest",
      slotKey: digestSlotKey(input.localDateKey),
      hour: input.localHour,
      habitIds: uncued.map((habit) => habit.id),
    });
  }

  return slots;
}

/** Player-facing schedule from their chosen local time. Never mention UTC. */
export function describePushReminderSchedule(reminderTime?: string | null) {
  return describeReminderSchedule(reminderTime);
}

export function hasSentPushSlot(sentSlots: ReadonlySet<string>, slotKey: string) {
  return sentSlots.has(slotKey);
}
