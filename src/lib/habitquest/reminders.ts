const REMINDER_FIRED_KEY = "habitquest::reminder-fired";

export type ReminderPermission = "granted" | "denied" | "unsupported" | "default";

export function getReminderPermission(): ReminderPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "granted") {
    return "granted";
  }
  if (Notification.permission === "denied") {
    return "denied";
  }
  return "default";
}

export function canFireBrowserReminder() {
  return getReminderPermission() === "granted";
}

export async function requestReminderPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported" as const;
  }

  if (Notification.permission === "granted") {
    return "granted" as const;
  }

  if (Notification.permission === "denied") {
    return "denied" as const;
  }

  const permission = await Notification.requestPermission();
  return permission === "granted" ? ("granted" as const) : ("denied" as const);
}

export function getReminderFiredKey(dateKey: string) {
  return `${REMINDER_FIRED_KEY}::${dateKey}`;
}

export function hasReminderFiredToday(dateKey: string) {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    return window.localStorage.getItem(getReminderFiredKey(dateKey)) === "1";
  } catch {
    return true;
  }
}

export function markReminderFiredToday(dateKey: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getReminderFiredKey(dateKey), "1");
  } catch {
    // Ignore storage errors.
  }
}

export function shouldFireReminder(reminderTime: string, now = new Date()) {
  const [hoursRaw, minutesRaw] = reminderTime.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return false;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = hours * 60 + minutes;
  return currentMinutes >= targetMinutes;
}

export function fireDailyReminder(displayName: string, dueCount: number) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  const name = displayName.trim() || "Adventurer";
  const body =
    dueCount > 0
      ? `${name}, you have ${dueCount} habit${dueCount === 1 ? "" : "s"} due today.`
      : `${name}, check HabitQuest and keep your streak alive.`;

  try {
    new Notification("HabitQuest reminder", {
      body,
      tag: "habitquest-daily-reminder",
    });
    return true;
  } catch {
    return false;
  }
}
