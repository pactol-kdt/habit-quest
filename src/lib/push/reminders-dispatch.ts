import "server-only";

import { and, eq, inArray, lt } from "drizzle-orm";
import { db } from "~/lib/db";
import {
  habits,
  habitCompletions,
  pushReminderSends,
  pushSubscriptions,
  userSettings,
} from "~/lib/db/schema";
import { getDueHabitsForDate } from "~/lib/habitquest/utils";
import {
  buildCueHourReminderCopy,
  buildDailyReminderCopy,
} from "~/lib/habitquest/reminder-copy";
import { describeStackFormula } from "~/lib/habitquest/habit-loop";
import {
  DEFAULT_REMINDER_LOCAL_TIME,
  getDateKeyInTimeZone,
  getLocalHourInTimeZone,
  hasSentPushSlot,
  resolvePushSlotsForHour,
  type PlannedPushSlot,
} from "~/lib/push/timezone";
import { isWebPushConfigured, sendWebPush, type PushPayload } from "~/lib/push/web-push";
import type { Habit, HabitDifficulty, HabitRecurrence } from "~/types/habitquest";

type Database = typeof db;

const SEND_LOG_TTL_MS = 2 * 24 * 60 * 60 * 1000;

function stackLineForHabit(habit: Habit, allHabits: Habit[]) {
  return describeStackFormula(habit, allHabits) ?? (habit.stackAfter.trim() || null);
}

function stackHintForHabits(habitsForHint: Habit[], allHabits: Habit[]) {
  if (!habitsForHint.length) {
    return null;
  }
  return (
    describeStackFormula(habitsForHint[0]!, allHabits) ??
    habitsForHint.find((habit) => habit.stackAfter.trim())?.stackAfter ??
    null
  );
}

function buildDigestPayload(
  displayName: string,
  slotHabits: Habit[],
  allHabits: Habit[],
): PushPayload {
  const { title, body } = buildDailyReminderCopy(
    displayName,
    slotHabits.length,
    stackHintForHabits(slotHabits, allHabits),
  );
  return {
    title,
    body,
    tag: "habitquest-daily-reminder",
    url: "/",
  };
}

function buildCuePayload(
  displayName: string,
  slotHabits: Habit[],
  allHabits: Habit[],
  hour: number,
): PushPayload {
  const { title, body } = buildCueHourReminderCopy(
    displayName,
    slotHabits.map((habit) => ({
      title: habit.title,
      stackLine: stackLineForHabit(habit, allHabits),
    })),
  );
  return {
    title,
    body,
    tag: `habitquest-cue-${String(hour).padStart(2, "0")}`,
    url: "/",
  };
}

function payloadForSlot(
  displayName: string,
  slot: PlannedPushSlot,
  slotHabits: Habit[],
  allHabits: Habit[],
): PushPayload {
  if (slot.kind === "cue") {
    return buildCuePayload(displayName, slotHabits, allHabits, slot.hour);
  }
  return buildDigestPayload(displayName, slotHabits, allHabits);
}

async function loadHabitsForUser(database: Database, userId: string): Promise<Habit[]> {
  const rows = await database.select().from(habits).where(eq(habits.userId, userId));
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    difficulty: row.difficulty as HabitDifficulty,
    recurrence: row.recurrence as HabitRecurrence,
    customDays: Array.isArray(row.customDays) ? row.customDays : [],
    stackAfter: row.stackAfter ?? "",
    stackAfterHabitId: row.stackAfterHabitId ?? null,
    cueTime: row.cueTime ?? null,
    cueContext: row.cueContext ?? "",
    identityWhy: row.identityWhy ?? "",
    desiredFeeling: row.desiredFeeling ?? "",
    tinyVersion: row.tinyVersion ?? "",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

async function loadIncompleteDueHabits(
  database: Database,
  userId: string,
  dateKey: string,
) {
  const userHabits = await loadHabitsForUser(database, userId);
  const due = getDueHabitsForDate(userHabits, dateKey);
  if (!due.length) {
    return [] as Habit[];
  }

  const completed = await database
    .select({ habitId: habitCompletions.habitId })
    .from(habitCompletions)
    .where(
      and(
        eq(habitCompletions.userId, userId),
        eq(habitCompletions.date, dateKey),
        inArray(
          habitCompletions.habitId,
          due.map((habit) => habit.id),
        ),
      ),
    );

  const done = new Set(completed.map((row) => row.habitId));
  return due.filter((habit) => !done.has(habit.id));
}

async function pruneOldPushReminderSends(database: Database, now: Date) {
  const cutoff = new Date(now.getTime() - SEND_LOG_TTL_MS).toISOString();
  await database.delete(pushReminderSends).where(lt(pushReminderSends.createdAt, cutoff));
}

async function recordPushSlot(database: Database, userId: string, slotKey: string, now: Date) {
  await database
    .insert(pushReminderSends)
    .values({
      userId,
      slotKey,
      createdAt: now.toISOString(),
    })
    .onConflictDoNothing();
}

export async function sendPushToUser(
  database: Database,
  userId: string,
  payload: PushPayload,
) {
  if (!isWebPushConfigured()) {
    return { sent: 0, failed: 0, error: "Web Push is not configured." as const };
  }

  const subscriptions = await database
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  if (!subscriptions.length) {
    return { sent: 0, failed: 0, error: "No push subscription on this account." as const };
  }

  let sent = 0;
  let failed = 0;

  for (const row of subscriptions) {
    try {
      await sendWebPush(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        payload,
      );
      sent += 1;
    } catch (error) {
      failed += 1;
      const statusCode =
        error && typeof error === "object" && "statusCode" in error
          ? Number((error as { statusCode?: number }).statusCode)
          : 0;
      // Gone / expired subscription — drop it.
      if (statusCode === 404 || statusCode === 410) {
        await database
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.endpoint, row.endpoint));
      }
    }
  }

  return { sent, failed };
}

export async function sendTestPushToUser(
  database: Database,
  userId: string,
  displayName: string,
) {
  const dateKey = getDateKeyInTimeZone(
    (
      await database
        .select({ reminderTimezone: userSettings.reminderTimezone })
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1)
    )[0]?.reminderTimezone || "UTC",
  );
  const incomplete = await loadIncompleteDueHabits(database, userId, dateKey);
  const allHabits = await loadHabitsForUser(database, userId);
  return sendPushToUser(
    database,
    userId,
    buildDigestPayload(displayName, incomplete, allHabits),
  );
}

export async function dispatchDuePushReminders(database: Database, now = new Date()) {
  if (!isWebPushConfigured()) {
    return { checked: 0, sentUsers: 0, skipped: 0, failed: 0 };
  }

  await pruneOldPushReminderSends(database, now);

  const candidates = await database
    .select({
      userId: userSettings.userId,
      displayName: userSettings.displayName,
      reminderTimezone: userSettings.reminderTimezone,
    })
    .from(userSettings)
    .where(eq(userSettings.remindersEnabled, true));

  let sentUsers = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of candidates) {
    const timeZone = user.reminderTimezone || "UTC";
    const localDateKey = getDateKeyInTimeZone(timeZone, now);
    const localHour = getLocalHourInTimeZone(timeZone, now);

    const subscriptions = await database
      .select({ endpoint: pushSubscriptions.endpoint })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, user.userId))
      .limit(1);

    if (!subscriptions.length) {
      skipped += 1;
      continue;
    }

    const incomplete = await loadIncompleteDueHabits(database, user.userId, localDateKey);
    const planned = resolvePushSlotsForHour({
      incomplete,
      reminderTime: DEFAULT_REMINDER_LOCAL_TIME,
      localDateKey,
      localHour,
    });

    if (!planned.length) {
      skipped += 1;
      continue;
    }

    const sentRows = await database
      .select({ slotKey: pushReminderSends.slotKey })
      .from(pushReminderSends)
      .where(eq(pushReminderSends.userId, user.userId));
    const sentKeys = new Set(sentRows.map((row) => row.slotKey));

    const pending = planned.filter((slot) => !hasSentPushSlot(sentKeys, slot.slotKey));
    if (!pending.length) {
      skipped += 1;
      continue;
    }

    const allHabits = await loadHabitsForUser(database, user.userId);
    const byId = new Map(incomplete.map((habit) => [habit.id, habit]));
    let userSent = false;
    let userFailed = false;

    for (const slot of pending) {
      const slotHabits = slot.habitIds
        .map((habitId) => byId.get(habitId))
        .filter((habit): habit is Habit => Boolean(habit));
      if (!slotHabits.length) {
        continue;
      }

      const result = await sendPushToUser(
        database,
        user.userId,
        payloadForSlot(user.displayName, slot, slotHabits, allHabits),
      );

      if (result.sent > 0) {
        await recordPushSlot(database, user.userId, slot.slotKey, now);
        userSent = true;
      } else {
        userFailed = true;
      }
    }

    if (userSent) {
      sentUsers += 1;
    } else if (userFailed) {
      failed += 1;
    } else {
      skipped += 1;
    }
  }

  return {
    checked: candidates.length,
    sentUsers,
    skipped,
    failed,
  };
}
