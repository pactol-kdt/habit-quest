import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { getCurrentUser } from "~/lib/auth/session";
import { db, ensureDatabase } from "~/lib/db";
import {
  equippedCosmetics,
  friendNudges,
  friendships,
  habitCompletions,
  habits,
  pushSubscriptions,
  userProgress,
  userSettings,
  users,
} from "~/lib/db/schema";
import { getDueHabitsForDate } from "~/lib/habitquest/utils";
import { getDateKeyInTimeZone } from "~/lib/push/timezone";
import { sendPushToUser } from "~/lib/push/reminders-dispatch";
import type { Habit, HabitDifficulty, HabitRecurrence } from "~/types/habitquest";
import {
  buildNudgeCopy,
  formatUid,
  normalizeUid,
  nudgeAvailability,
  orderUserPair,
  type FriendCard,
  type FriendRequestCard,
} from "~/lib/v1/friend-rules";

const LOOKUP_LIMIT = 20;
const LOOKUP_WINDOW_MS = 60 * 60 * 1000;
const lookupAttempts = new Map<string, number[]>();

export type { FriendCard, FriendRequestCard } from "~/lib/v1/friend-rules";

type Database = typeof db;

function allowUidLookup(userId: string) {
  const now = Date.now();
  const recent = (lookupAttempts.get(userId) ?? []).filter((at) => now - at < LOOKUP_WINDOW_MS);
  if (recent.length >= LOOKUP_LIMIT) {
    lookupAttempts.set(userId, recent);
    return false;
  }
  recent.push(now);
  lookupAttempts.set(userId, recent);
  return true;
}

function resolveDisplayName(accountName: string | null | undefined, settingsName: string | null | undefined) {
  return accountName?.trim() || settingsName?.trim() || "Adventurer";
}

function otherUserId(row: { userLowId: string; userHighId: string }, userId: string) {
  return row.userLowId === userId ? row.userHighId : row.userLowId;
}

function toHabit(row: typeof habits.$inferSelect): Habit {
  return {
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
  };
}

async function loadProfiles(database: Database, userIds: string[]) {
  if (!userIds.length) {
    return new Map<string, Omit<FriendCard, "today" | "nudge">>();
  }

  const rows = await database
    .select({
      userId: users.id,
      accountName: users.displayName,
      settingsName: userSettings.displayName,
      level: userProgress.level,
      totalExp: userProgress.totalExp,
      currentStreak: userProgress.currentStreak,
      bestStreak: userProgress.bestStreak,
      avatarItemId: equippedCosmetics.avatarItemId,
      frameItemId: equippedCosmetics.frameItemId,
      titleItemId: equippedCosmetics.titleItemId,
    })
    .from(users)
    .leftJoin(userSettings, eq(users.id, userSettings.userId))
    .leftJoin(userProgress, eq(users.id, userProgress.userId))
    .leftJoin(equippedCosmetics, eq(users.id, equippedCosmetics.userId))
    .where(inArray(users.id, userIds));

  return new Map(
    rows.map((row) => [
      row.userId,
      {
        userId: row.userId,
        displayName: resolveDisplayName(row.accountName, row.settingsName),
        level: row.level ?? 1,
        totalExp: row.totalExp ?? 0,
        currentStreak: row.currentStreak ?? 0,
        bestStreak: row.bestStreak ?? 0,
        avatarItemId: row.avatarItemId,
        frameItemId: row.frameItemId,
        titleItemId: row.titleItemId,
      },
    ]),
  );
}

async function loadToday(database: Database, userIds: string[]) {
  const today = new Map<string, { done: number; due: number; dateKey: string }>();
  if (!userIds.length) {
    return today;
  }

  const settingsRows = await database
    .select({
      userId: userSettings.userId,
      reminderTimezone: userSettings.reminderTimezone,
    })
    .from(userSettings)
    .where(inArray(userSettings.userId, userIds));
  const timezoneByUser = new Map(settingsRows.map((row) => [row.userId, row.reminderTimezone || "UTC"]));
  const dateByUser = new Map(
    userIds.map((userId) => [userId, getDateKeyInTimeZone(timezoneByUser.get(userId) || "UTC")]),
  );

  const habitRows = await database.select().from(habits).where(inArray(habits.userId, userIds));
  const habitsByUser = new Map<string, Habit[]>();
  for (const row of habitRows) {
    const list = habitsByUser.get(row.userId) ?? [];
    list.push(toHabit(row));
    habitsByUser.set(row.userId, list);
  }

  const dateKeys = [...new Set(dateByUser.values())];
  const completionRows = dateKeys.length
    ? await database
        .select({
          userId: habitCompletions.userId,
          habitId: habitCompletions.habitId,
          date: habitCompletions.date,
        })
        .from(habitCompletions)
        .where(
          and(inArray(habitCompletions.userId, userIds), inArray(habitCompletions.date, dateKeys)),
        )
    : [];
  const doneKeys = new Set(completionRows.map((row) => `${row.userId}:${row.date}:${row.habitId}`));

  for (const userId of userIds) {
    const dateKey = dateByUser.get(userId)!;
    const due = getDueHabitsForDate(habitsByUser.get(userId) ?? [], dateKey);
    const done = due.filter((habit) => doneKeys.has(`${userId}:${dateKey}:${habit.id}`)).length;
    today.set(userId, { done, due: due.length, dateKey });
  }

  return today;
}

type FriendsListResult = Awaited<ReturnType<typeof loadFriendsList>>;
const friendsListInflight = new Map<string, Promise<FriendsListResult>>();

export async function getFriendsAction() {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const existing = friendsListInflight.get(user.id);
  if (existing) {
    return existing;
  }

  const pending = loadFriendsList(user).finally(() => {
    friendsListInflight.delete(user.id);
  });
  friendsListInflight.set(user.id, pending);
  return pending;
}

async function loadFriendsList(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
  const database = await ensureDatabase();
  const rows = await database
    .select()
    .from(friendships)
    .where(or(eq(friendships.userLowId, user.id), eq(friendships.userHighId, user.id)));

  const accepted = rows.filter((row) => row.status === "accepted");
  const pending = rows.filter((row) => row.status === "pending");
  const friendIds = accepted.map((row) => otherUserId(row, user.id));
  const requestIds = pending.map((row) => otherUserId(row, user.id));
  const profiles = await loadProfiles(database, [...new Set([...friendIds, ...requestIds])]);
  const today = await loadToday(database, friendIds);

  const pushRows = friendIds.length
    ? await database
        .select({ userId: pushSubscriptions.userId })
        .from(pushSubscriptions)
        .where(inArray(pushSubscriptions.userId, friendIds))
    : [];
  const hasPush = new Set(pushRows.map((row) => row.userId));

  const nudgeRows = friendIds.length
    ? await database
        .select()
        .from(friendNudges)
        .where(and(eq(friendNudges.fromUserId, user.id), inArray(friendNudges.toUserId, friendIds)))
    : [];
  const nudged = new Set(
    nudgeRows
      .filter((row) => row.localDate === today.get(row.toUserId)?.dateKey)
      .map((row) => row.toUserId),
  );

  const friends: FriendCard[] = friendIds
    .map((friendId) => {
      const profile = profiles.get(friendId);
      const progress = today.get(friendId) ?? { done: 0, due: 0, dateKey: "" };
      if (!profile) {
        return null;
      }
      return {
        ...profile,
        today: { done: progress.done, due: progress.due },
        nudge: nudgeAvailability({
          done: progress.done,
          due: progress.due,
          alreadyNudged: nudged.has(friendId),
          hasPush: hasPush.has(friendId),
        }),
      };
    })
    .filter((entry): entry is FriendCard => entry !== null)
    .sort(
      (a, b) =>
        b.currentStreak - a.currentStreak ||
        b.bestStreak - a.bestStreak ||
        b.totalExp - a.totalExp,
    );

  const requests: FriendRequestCard[] = pending
    .map((row) => {
      const otherId = otherUserId(row, user.id);
      const profile = profiles.get(otherId);
      if (!profile) {
        return null;
      }
      return {
        requestId: row.id,
        userId: otherId,
        displayName: profile.displayName,
        avatarItemId: profile.avatarItemId,
        frameItemId: profile.frameItemId,
        direction: row.requestedBy === user.id ? ("outgoing" as const) : ("incoming" as const),
      };
    })
    .filter((entry): entry is FriendRequestCard => entry !== null);

  return {
    ok: true as const,
    uid: formatUid(user.uid),
    friends,
    requests,
  };
}

export async function sendFriendRequestAction(rawUid: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const uid = normalizeUid(rawUid);
  if (!uid) {
    return { ok: false as const, error: "That UID is invalid." };
  }
  if (!allowUidLookup(user.id)) {
    return { ok: false as const, error: "Too many UID lookups. Try again later." };
  }

  const database = await ensureDatabase();
  const [target] = await database
    .select({ id: users.id })
    .from(users)
    .where(eq(users.uid, uid))
    .limit(1);

  if (!target) {
    return { ok: false as const, error: "No adventurer with that UID." };
  }
  if (target.id === user.id) {
    return { ok: false as const, error: "That is your UID." };
  }

  const pair = orderUserPair(user.id, target.id);
  const [existing] = await database
    .select()
    .from(friendships)
    .where(and(eq(friendships.userLowId, pair.low), eq(friendships.userHighId, pair.high)))
    .limit(1);

  if (existing?.status === "accepted") {
    return { ok: false as const, error: "You're already friends." };
  }
  if (existing?.status === "blocked") {
    return { ok: false as const, error: "You can't add this adventurer." };
  }
  if (existing?.status === "pending") {
    return {
      ok: false as const,
      error:
        existing.requestedBy === user.id
          ? "Request already sent."
          : "They already sent you a request. Accept it instead.",
    };
  }

  const now = new Date().toISOString();
  await database.insert(friendships).values({
    id: randomUUID(),
    userLowId: pair.low,
    userHighId: pair.high,
    requestedBy: user.id,
    status: "pending",
    blockedBy: null,
    createdAt: now,
    updatedAt: now,
  });

  return getFriendsAction();
}

async function loadOwnFriendship(database: Database, userId: string, requestId: string) {
  const [row] = await database
    .select()
    .from(friendships)
    .where(eq(friendships.id, requestId))
    .limit(1);
  if (!row || (row.userLowId !== userId && row.userHighId !== userId)) {
    return null;
  }
  return row;
}

export async function acceptFriendRequestAction(requestId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const database = await ensureDatabase();
  const row = await loadOwnFriendship(database, user.id, requestId);
  if (!row || row.status !== "pending" || row.requestedBy === user.id) {
    return { ok: false as const, error: "Request not found." };
  }

  await database
    .update(friendships)
    .set({ status: "accepted", updatedAt: new Date().toISOString() })
    .where(eq(friendships.id, row.id));

  return getFriendsAction();
}

export async function declineFriendRequestAction(requestId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const database = await ensureDatabase();
  const row = await loadOwnFriendship(database, user.id, requestId);
  if (!row || row.status !== "pending") {
    return { ok: false as const, error: "Request not found." };
  }

  await database.delete(friendships).where(eq(friendships.id, row.id));
  return getFriendsAction();
}

export async function removeFriendAction(friendUserId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const database = await ensureDatabase();
  const pair = orderUserPair(user.id, friendUserId);
  const [row] = await database
    .select()
    .from(friendships)
    .where(and(eq(friendships.userLowId, pair.low), eq(friendships.userHighId, pair.high)))
    .limit(1);

  if (!row || row.status !== "accepted") {
    return { ok: false as const, error: "Friend not found." };
  }

  await database.delete(friendships).where(eq(friendships.id, row.id));
  return getFriendsAction();
}

export async function nudgeFriendAction(friendUserId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const database = await ensureDatabase();
  const pair = orderUserPair(user.id, friendUserId);
  const [row] = await database
    .select({ status: friendships.status })
    .from(friendships)
    .where(and(eq(friendships.userLowId, pair.low), eq(friendships.userHighId, pair.high)))
    .limit(1);

  if (!row || row.status !== "accepted") {
    return { ok: false as const, error: "Friend not found." };
  }

  const today = await loadToday(database, [friendUserId]);
  const progress = today.get(friendUserId) ?? { done: 0, due: 0, dateKey: "" };
  if (progress.done >= progress.due) {
    return { ok: false as const, error: "They're already clear for today." };
  }

  const [subscription] = await database
    .select({ userId: pushSubscriptions.userId })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, friendUserId))
    .limit(1);

  const inserted = await database
    .insert(friendNudges)
    .values({
      fromUserId: user.id,
      toUserId: friendUserId,
      localDate: progress.dateKey,
      createdAt: new Date().toISOString(),
    })
    .onConflictDoNothing()
    .returning({ toUserId: friendNudges.toUserId });

  if (!inserted.length) {
    return { ok: false as const, error: "You already nudged them today." };
  }

  const [account] = await database
    .select({ accountName: users.displayName, settingsName: userSettings.displayName })
    .from(users)
    .leftJoin(userSettings, eq(users.id, userSettings.userId))
    .where(eq(users.id, user.id))
    .limit(1);
  const copy = buildNudgeCopy(
    resolveDisplayName(account?.accountName, account?.settingsName),
    progress.due - progress.done,
  );
  if (subscription) {
    void sendPushToUser(database, friendUserId, {
      title: copy.title,
      body: copy.body,
      tag: `habitquest-nudge-${user.id}-${progress.dateKey}`,
      url: "/",
    }).catch(() => {
      // The in-app nudge is already saved. A slow push gateway must not hold the page.
    });
    return { ok: true as const, nudge: "sent" as const, delivery: "push" as const };
  }

  return { ok: true as const, nudge: "sent" as const, delivery: "in-app" as const };
}

export async function getIncomingNudgesAction() {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const database = await ensureDatabase();
  const rows = await database
    .select({
      fromUserId: friendNudges.fromUserId,
      localDate: friendNudges.localDate,
      accountName: users.displayName,
      settingsName: userSettings.displayName,
    })
    .from(friendNudges)
    .innerJoin(users, eq(friendNudges.fromUserId, users.id))
    .leftJoin(userSettings, eq(friendNudges.fromUserId, userSettings.userId))
    .where(and(eq(friendNudges.toUserId, user.id), isNull(friendNudges.seenAt)));

  const today = await loadToday(database, [user.id]);
  const progress = today.get(user.id) ?? { done: 0, due: 0, dateKey: "" };
  const remaining = Math.max(0, progress.due - progress.done);

  return {
    ok: true as const,
    nudges: rows.map((row) => {
      const copy = buildNudgeCopy(resolveDisplayName(row.accountName, row.settingsName), remaining);
      return {
        fromUserId: row.fromUserId,
        localDate: row.localDate,
        title: copy.title,
        body: copy.body,
      };
    }),
  };
}

export async function markNudgeSeenAction(fromUserId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const database = await ensureDatabase();
  await database
    .update(friendNudges)
    .set({ seenAt: new Date().toISOString() })
    .where(and(eq(friendNudges.toUserId, user.id), eq(friendNudges.fromUserId, fromUserId)));

  return { ok: true as const };
}
