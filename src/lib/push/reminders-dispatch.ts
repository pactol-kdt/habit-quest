import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "~/lib/db";
import {
  habits,
  habitCompletions,
  pushSubscriptions,
  userSettings,
} from "~/lib/db/schema";
import { getDueHabitsForDate } from "~/lib/habitquest/utils";
import { buildDailyReminderCopy } from "~/lib/habitquest/reminder-copy";
import { describeStackFormula } from "~/lib/habitquest/habit-loop";
import {
  FIXED_REMINDER_LOCAL_TIME,
  getDateKeyInTimeZone,
  isWithinReminderHourInTimeZone,
} from "~/lib/push/timezone";
import { isWebPushConfigured, sendWebPush, type PushPayload } from "~/lib/push/web-push";
import type { Habit, HabitDifficulty, HabitRecurrence } from "~/types/habitquest";

type Database = typeof db;

function buildReminderPayload(
  displayName: string,
  dueCount: number,
  stackHint?: string | null,
): PushPayload {
  const { title, body } = buildDailyReminderCopy(displayName, dueCount, stackHint);
  return {
    title,
    body,
    tag: "habitquest-daily-reminder",
    url: "/",
  };
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

function stackHintForHabits(habits: Habit[], allHabits: Habit[]) {
  if (!habits.length) {
    return null;
  }
  return (
    describeStackFormula(habits[0]!, allHabits) ??
    habits.find((habit) => habit.stackAfter.trim())?.stackAfter ??
    null
  );
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
    buildReminderPayload(
      displayName,
      incomplete.length,
      stackHintForHabits(incomplete, allHabits),
    ),
  );
}

export async function dispatchDuePushReminders(database: Database, now = new Date()) {
  if (!isWebPushConfigured()) {
    return { checked: 0, sentUsers: 0, skipped: 0, failed: 0 };
  }

  const candidates = await database
    .select({
      userId: userSettings.userId,
      displayName: userSettings.displayName,
      reminderTimezone: userSettings.reminderTimezone,
      lastPushReminderDate: userSettings.lastPushReminderDate,
    })
    .from(userSettings)
    .where(eq(userSettings.remindersEnabled, true));

  let sentUsers = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of candidates) {
    const timeZone = user.reminderTimezone || "UTC";
    const dateKey = getDateKeyInTimeZone(timeZone, now);

    if (user.lastPushReminderDate === dateKey) {
      skipped += 1;
      continue;
    }

    // Fixed 08:00 local — only send during that hour so hourly UTC crons map cleanly.
    if (!isWithinReminderHourInTimeZone(FIXED_REMINDER_LOCAL_TIME, timeZone, now)) {
      skipped += 1;
      continue;
    }

    const subscriptions = await database
      .select({ endpoint: pushSubscriptions.endpoint })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, user.userId))
      .limit(1);

    if (!subscriptions.length) {
      skipped += 1;
      continue;
    }

    const incomplete = await loadIncompleteDueHabits(database, user.userId, dateKey);
    const allHabits = await loadHabitsForUser(database, user.userId);
    const result = await sendPushToUser(
      database,
      user.userId,
      buildReminderPayload(
        user.displayName,
        incomplete.length,
        stackHintForHabits(incomplete, allHabits),
      ),
    );

    if (result.sent > 0) {
      await database
        .update(userSettings)
        .set({ lastPushReminderDate: dateKey })
        .where(eq(userSettings.userId, user.userId));
      sentUsers += 1;
    } else {
      failed += 1;
    }
  }

  return {
    checked: candidates.length,
    sentUsers,
    skipped,
    failed,
  };
}
