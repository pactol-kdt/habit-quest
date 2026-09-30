import "server-only";

import { randomUUID } from "node:crypto";
import { and, count, desc, eq, gte, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { getCurrentUser } from "~/lib/auth/session";
import { db, ensureDatabase } from "~/lib/db";
import {
  equippedCosmetics,
  friendAcceptNotices,
  friendCheers,
  friendFinishNotices,
  friendNudges,
  friendStreakNotices,
  friendships,
  habitCompletions,
  habits,
  pushSubscriptions,
  rewardSystems,
  userProgress,
  userSettings,
  users,
} from "~/lib/db/schema";
import { getDueHabitsForDate } from "~/lib/habitquest/utils";
import { getDateKeyInTimeZone } from "~/lib/push/timezone";
import { sendPushToUser } from "~/lib/push/reminders-dispatch";
import type { Habit, HabitDifficulty, HabitRecurrence } from "~/types/habitquest";
import {
  buildAcceptCopy,
  buildActivityNudgeCopy,
  buildCheerCopy,
  buildFinishCopy,
  buildFriendRequestCopy,
  buildNudgeCopy,
  buildStreakCopy,
  formatUid,
  isFriendStreakMilestone,
  normalizeUid,
  type FriendActivityItem,
  type FriendProfileView,
  nudgeAvailability,
  orderUserPair,
  type BlockedPerson,
  type FriendCard,
  type FriendLookupPreview,
  type FriendLookupRelation,
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

const ACTIVITY_LIMIT = 12;
const ACTIVITY_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

async function loadActivity(
  database: Database,
  userId: string,
  friendIds: string[],
  profiles: { get(id: string): { displayName: string } | undefined },
) {
  if (!friendIds.length) {
    return [] as FriendActivityItem[];
  }

  const cutoff = new Date(Date.now() - ACTIVITY_WINDOW_MS).toISOString();
  const fromFriends = inArray(friendAcceptNotices.fromUserId, friendIds);

  const [settings, accepts, nudges, finishes, streaks, cheers] = await Promise.all([
    database
      .select({ reminderTimezone: userSettings.reminderTimezone })
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1),
    database
      .select({
        fromUserId: friendAcceptNotices.fromUserId,
        createdAt: friendAcceptNotices.createdAt,
      })
      .from(friendAcceptNotices)
      .where(
        and(
          eq(friendAcceptNotices.toUserId, userId),
          fromFriends,
          gte(friendAcceptNotices.createdAt, cutoff),
        ),
      )
      .orderBy(desc(friendAcceptNotices.createdAt))
      .limit(ACTIVITY_LIMIT),
    database
      .select({
        fromUserId: friendNudges.fromUserId,
        localDate: friendNudges.localDate,
        createdAt: friendNudges.createdAt,
      })
      .from(friendNudges)
      .where(
        and(
          eq(friendNudges.toUserId, userId),
          inArray(friendNudges.fromUserId, friendIds),
          gte(friendNudges.createdAt, cutoff),
        ),
      )
      .orderBy(desc(friendNudges.createdAt))
      .limit(ACTIVITY_LIMIT),
    database
      .select({
        fromUserId: friendFinishNotices.fromUserId,
        localDate: friendFinishNotices.localDate,
        createdAt: friendFinishNotices.createdAt,
      })
      .from(friendFinishNotices)
      .where(
        and(
          eq(friendFinishNotices.toUserId, userId),
          inArray(friendFinishNotices.fromUserId, friendIds),
          gte(friendFinishNotices.createdAt, cutoff),
        ),
      )
      .orderBy(desc(friendFinishNotices.createdAt))
      .limit(ACTIVITY_LIMIT),
    database
      .select({
        fromUserId: friendStreakNotices.fromUserId,
        streak: friendStreakNotices.streak,
        localDate: friendStreakNotices.localDate,
        createdAt: friendStreakNotices.createdAt,
      })
      .from(friendStreakNotices)
      .where(
        and(
          eq(friendStreakNotices.toUserId, userId),
          inArray(friendStreakNotices.fromUserId, friendIds),
          gte(friendStreakNotices.createdAt, cutoff),
        ),
      )
      .orderBy(desc(friendStreakNotices.createdAt))
      .limit(ACTIVITY_LIMIT),
    database
      .select({
        fromUserId: friendCheers.fromUserId,
        localDate: friendCheers.localDate,
        createdAt: friendCheers.createdAt,
      })
      .from(friendCheers)
      .where(
        and(
          eq(friendCheers.toUserId, userId),
          inArray(friendCheers.fromUserId, friendIds),
          gte(friendCheers.createdAt, cutoff),
        ),
      )
      .orderBy(desc(friendCheers.createdAt))
      .limit(ACTIVITY_LIMIT),
  ]);
  const todayKey = getDateKeyInTimeZone(settings[0]?.reminderTimezone || "UTC");

  const items: FriendActivityItem[] = [
    ...accepts.map((row) => {
      const copy = buildAcceptCopy(profiles.get(row.fromUserId)?.displayName ?? "");
      return {
        id: `accept:${row.fromUserId}`,
        title: copy.title,
        body: copy.body,
        createdAt: row.createdAt,
      };
    }),
    ...nudges.map((row) => {
      const copy = buildActivityNudgeCopy(
        profiles.get(row.fromUserId)?.displayName ?? "",
        row.localDate === todayKey,
      );
      return {
        id: `nudge:${row.fromUserId}:${row.localDate}`,
        title: copy.title,
        body: copy.body,
        createdAt: row.createdAt,
      };
    }),
    ...finishes.map((row) => {
      const copy = buildFinishCopy(profiles.get(row.fromUserId)?.displayName ?? "");
      return {
        id: `finish:${row.fromUserId}:${row.localDate}`,
        title: copy.title,
        body: copy.body,
        createdAt: row.createdAt,
      };
    }),
    ...streaks.map((row) => {
      const copy = buildStreakCopy(profiles.get(row.fromUserId)?.displayName ?? "", row.streak);
      return {
        id: `streak:${row.fromUserId}:${row.streak}:${row.localDate}`,
        title: copy.title,
        body: copy.body,
        createdAt: row.createdAt,
      };
    }),
    ...cheers.map((row) => {
      const copy = buildCheerCopy(profiles.get(row.fromUserId)?.displayName ?? "");
      return {
        id: `cheer:${row.fromUserId}:${row.localDate}`,
        title: copy.title,
        body: copy.body,
        createdAt: row.createdAt,
      };
    }),
  ];

  return items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, ACTIVITY_LIMIT);
}

function attachFinishCheers(
  items: FriendActivityItem[],
  today: Map<string, { done: number; dateKey: string }>,
  cheeredFriendIds: Set<string>,
): FriendActivityItem[] {
  return items.map((item) => {
    if (!item.id.startsWith("finish:")) {
      return item;
    }
    const [, friendId, localDate] = item.id.split(":");
    if (!friendId || !localDate) {
      return item;
    }
    const progress = today.get(friendId);
    if (!progress || progress.dateKey !== localDate || progress.done < 1) {
      return item;
    }
    return {
      ...item,
      cheerUserId: friendId,
      cheerSent: cheeredFriendIds.has(friendId),
    };
  });
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

export async function getIncomingFriendRequestCountAction() {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const database = await ensureDatabase();
  const [row] = await database
    .select({ value: count() })
    .from(friendships)
    .where(
      and(
        or(eq(friendships.userLowId, user.id), eq(friendships.userHighId, user.id)),
        eq(friendships.status, "pending"),
        ne(friendships.requestedBy, user.id),
      ),
    );

  return { ok: true as const, count: Number(row?.value ?? 0) };
}

async function loadFriendsList(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
  const database = await ensureDatabase();
  const rows = await database
    .select()
    .from(friendships)
    .where(or(eq(friendships.userLowId, user.id), eq(friendships.userHighId, user.id)));

  const accepted = rows.filter((row) => row.status === "accepted");
  const pending = rows.filter((row) => row.status === "pending");
  const blockedRows = rows.filter((row) => row.status === "blocked" && row.blockedBy === user.id);
  const friendIds = accepted.map((row) => otherUserId(row, user.id));
  const requestIds = pending.map((row) => otherUserId(row, user.id));
  const blockedIds = blockedRows.map((row) => otherUserId(row, user.id));
  const profileIds = [...new Set([...friendIds, ...requestIds, ...blockedIds])];
  const profilesPromise = loadProfiles(database, profileIds);
  const [profiles, today, pushRows, nudgeRows, cheerRows, activity] = await Promise.all([
    profilesPromise,
    loadToday(database, friendIds),
    friendIds.length
      ? database
          .select({ userId: pushSubscriptions.userId })
          .from(pushSubscriptions)
          .where(inArray(pushSubscriptions.userId, friendIds))
      : Promise.resolve([] as { userId: string }[]),
    friendIds.length
      ? database
          .select()
          .from(friendNudges)
          .where(and(eq(friendNudges.fromUserId, user.id), inArray(friendNudges.toUserId, friendIds)))
      : Promise.resolve([] as { toUserId: string; localDate: string }[]),
    friendIds.length
      ? database
          .select({ toUserId: friendCheers.toUserId, localDate: friendCheers.localDate })
          .from(friendCheers)
          .where(and(eq(friendCheers.fromUserId, user.id), inArray(friendCheers.toUserId, friendIds)))
      : Promise.resolve([] as { toUserId: string; localDate: string }[]),
    profilesPromise.then((loaded) => loadActivity(database, user.id, friendIds, loaded)),
  ]);
  const hasPush = new Set(pushRows.map((row) => row.userId));
  const nudged = new Set(
    nudgeRows
      .filter((row) => row.localDate === today.get(row.toUserId)?.dateKey)
      .map((row) => row.toUserId),
  );
  const cheered = new Set(
    cheerRows
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
        cheer: progress.done < 1 ? ("hidden" as const) : cheered.has(friendId) ? ("sent" as const) : ("available" as const),
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

  const blocked: BlockedPerson[] = blockedIds
    .map((blockedId) => {
      const profile = profiles.get(blockedId);
      if (!profile) {
        return null;
      }
      return {
        userId: blockedId,
        displayName: profile.displayName,
        avatarItemId: profile.avatarItemId,
        frameItemId: profile.frameItemId,
      };
    })
    .filter((entry): entry is BlockedPerson => entry !== null);

  return {
    ok: true as const,
    uid: formatUid(user.uid),
    friends,
    requests,
    blocked,
    activity: attachFinishCheers(activity, today, cheered),
  };
}

const NAME_LOOKUP_LIMIT = 8;

function friendLookupRelation(
  existing: { status: string; requestedBy: string } | undefined,
  userId: string,
): FriendLookupRelation {
  if (existing?.status === "accepted") {
    return "friends";
  }
  if (existing?.status === "blocked") {
    return "blocked";
  }
  if (existing?.status === "pending") {
    return existing.requestedBy === userId ? "outgoing" : "incoming";
  }
  return "none";
}

export async function lookupFriendAction(rawQuery: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const query = rawQuery.trim();
  if (!query) {
    return { ok: false as const, error: "Enter a username or UID." };
  }
  if (!allowUidLookup(user.id)) {
    return { ok: false as const, error: "Too many lookups. Try again later." };
  }

  const database = await ensureDatabase();
  const uid = normalizeUid(query);
  const name = query.slice(0, 32);

  type LookupRow = {
    id: string;
    uid: string;
    accountName: string | null;
    settingsName: string | null;
    level: number | null;
    avatarItemId: string | null;
    frameItemId: string | null;
    titleItemId: string | null;
  };

  let rows: LookupRow[] = [];
  if (uid) {
    rows = await database
      .select({
        id: users.id,
        uid: users.uid,
        accountName: users.displayName,
        settingsName: userSettings.displayName,
        level: userProgress.level,
        avatarItemId: equippedCosmetics.avatarItemId,
        frameItemId: equippedCosmetics.frameItemId,
        titleItemId: equippedCosmetics.titleItemId,
      })
      .from(users)
      .leftJoin(userSettings, eq(users.id, userSettings.userId))
      .leftJoin(userProgress, eq(users.id, userProgress.userId))
      .leftJoin(equippedCosmetics, eq(users.id, equippedCosmetics.userId))
      .where(eq(users.uid, uid))
      .limit(1);
  }

  if (!rows.length) {
    if (name.length < 2) {
      return { ok: false as const, error: uid ? "No adventurer with that UID." : "Enter a username or UID." };
    }
    const lowered = name.toLowerCase();
    rows = await database
      .select({
        id: users.id,
        uid: users.uid,
        accountName: users.displayName,
        settingsName: userSettings.displayName,
        level: userProgress.level,
        avatarItemId: equippedCosmetics.avatarItemId,
        frameItemId: equippedCosmetics.frameItemId,
        titleItemId: equippedCosmetics.titleItemId,
      })
      .from(users)
      .leftJoin(userSettings, eq(users.id, userSettings.userId))
      .leftJoin(userProgress, eq(users.id, userProgress.userId))
      .leftJoin(equippedCosmetics, eq(users.id, equippedCosmetics.userId))
      .where(
        or(
          sql`lower(${users.displayName}) = ${lowered}`,
          sql`lower(${userSettings.displayName}) = ${lowered}`,
        ),
      )
      .limit(24);
  }

  const others = rows.filter((row) => row.id !== user.id);
  if (!others.length) {
    if (rows.some((row) => row.id === user.id)) {
      return { ok: false as const, error: uid && rows.length === 1 ? "That is your UID." : "That is your name." };
    }
    return { ok: false as const, error: uid ? "No adventurer with that UID." : "No adventurer with that name." };
  }

  const ids = others.map((row) => row.id);
  const friendshipsRows = await database
    .select({
      userLowId: friendships.userLowId,
      userHighId: friendships.userHighId,
      status: friendships.status,
      requestedBy: friendships.requestedBy,
    })
    .from(friendships)
    .where(
      or(
        and(eq(friendships.userLowId, user.id), inArray(friendships.userHighId, ids)),
        and(eq(friendships.userHighId, user.id), inArray(friendships.userLowId, ids)),
      ),
    );
  const relationByUser = new Map(
    friendshipsRows.map((row) => [otherUserId(row, user.id), friendLookupRelation(row, user.id)]),
  );

  const previews: FriendLookupPreview[] = others.slice(0, NAME_LOOKUP_LIMIT).map((row) => ({
    userId: row.id,
    displayName: resolveDisplayName(row.accountName, row.settingsName),
    uid: formatUid(row.uid),
    level: row.level ?? 1,
    avatarItemId: row.avatarItemId,
    frameItemId: row.frameItemId,
    titleItemId: row.titleItemId,
    relation: relationByUser.get(row.id) ?? "none",
  }));

  return { ok: true as const, previews };
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
    alertSeenAt: null,
    createdAt: now,
    updatedAt: now,
  });

  const [account] = await database
    .select({ accountName: users.displayName, settingsName: userSettings.displayName })
    .from(users)
    .leftJoin(userSettings, eq(users.id, userSettings.userId))
    .where(eq(users.id, user.id))
    .limit(1);
  const copy = buildFriendRequestCopy(resolveDisplayName(account?.accountName, account?.settingsName));
  const delivery = await deliverFriendAlert(database, target.id, {
    title: copy.title,
    body: copy.body,
    tag: `habitquest-friend-request-${user.id}`,
    url: "/friends",
  });

  const list = await getFriendsAction();
  if (!list.ok) {
    return list;
  }
  return { ...list, delivery };
}

async function deliverFriendAlert(
  database: Database,
  toUserId: string,
  payload: { title: string; body: string; tag: string; url: string },
) {
  const [subscription] = await database
    .select({ userId: pushSubscriptions.userId })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, toUserId))
    .limit(1);
  if (!subscription) {
    return "in-app" as const;
  }
  void sendPushToUser(database, toUserId, payload).catch(() => {
    // The request is already saved. A slow push gateway must not hold the page.
  });
  return "push" as const;
}

export async function notifyFriendsOfStreakMilestone(
  database: Database,
  userId: string,
  streak: number,
  dateKey: string,
) {
  if (!isFriendStreakMilestone(streak)) {
    return;
  }

  const rows = await database
    .select()
    .from(friendships)
    .where(
      and(
        or(eq(friendships.userLowId, userId), eq(friendships.userHighId, userId)),
        eq(friendships.status, "accepted"),
      ),
    );
  if (!rows.length) {
    return;
  }

  const [account] = await database
    .select({ accountName: users.displayName, settingsName: userSettings.displayName })
    .from(users)
    .leftJoin(userSettings, eq(users.id, userSettings.userId))
    .where(eq(users.id, userId))
    .limit(1);
  const copy = buildStreakCopy(resolveDisplayName(account?.accountName, account?.settingsName), streak);
  const now = new Date().toISOString();

  for (const row of rows) {
    const friendId = otherUserId(row, userId);
    const inserted = await database
      .insert(friendStreakNotices)
      .values({
        fromUserId: userId,
        toUserId: friendId,
        streak,
        localDate: dateKey,
        createdAt: now,
      })
      .onConflictDoNothing()
      .returning({ toUserId: friendStreakNotices.toUserId });
    if (!inserted.length) {
      continue;
    }
    await deliverFriendAlert(database, friendId, {
      title: copy.title,
      body: copy.body,
      tag: `habitquest-streak-${userId}-${streak}-${dateKey}`,
      url: "/friends",
    });
  }
}

export async function notifyNudgersIfDayCleared(database: Database, userId: string, dateKey: string) {
  const today = await loadToday(database, [userId]);
  const progress = today.get(userId);
  if (!progress || progress.dateKey !== dateKey || progress.done < 1) {
    return;
  }

  const nudges = await database
    .select({ fromUserId: friendNudges.fromUserId })
    .from(friendNudges)
    .where(and(eq(friendNudges.toUserId, userId), eq(friendNudges.localDate, dateKey)));
  if (!nudges.length) {
    return;
  }

  const [account] = await database
    .select({ accountName: users.displayName, settingsName: userSettings.displayName })
    .from(users)
    .leftJoin(userSettings, eq(users.id, userSettings.userId))
    .where(eq(users.id, userId))
    .limit(1);
  const copy = buildFinishCopy(resolveDisplayName(account?.accountName, account?.settingsName));

  for (const nudge of nudges) {
    const inserted = await database
      .insert(friendFinishNotices)
      .values({
        fromUserId: userId,
        toUserId: nudge.fromUserId,
        localDate: dateKey,
        createdAt: new Date().toISOString(),
      })
      .onConflictDoNothing()
      .returning({ toUserId: friendFinishNotices.toUserId });
    if (!inserted.length) {
      continue;
    }
    await deliverFriendAlert(database, nudge.fromUserId, {
      title: copy.title,
      body: copy.body,
      tag: `habitquest-finish-${userId}-${dateKey}`,
      url: "/friends",
    });
  }
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

  const requesterId = row.requestedBy;
  const [account] = await database
    .select({ accountName: users.displayName, settingsName: userSettings.displayName })
    .from(users)
    .leftJoin(userSettings, eq(users.id, userSettings.userId))
    .where(eq(users.id, user.id))
    .limit(1);
  const copy = buildAcceptCopy(resolveDisplayName(account?.accountName, account?.settingsName));
  const now = new Date().toISOString();
  await database
    .insert(friendAcceptNotices)
    .values({
      fromUserId: user.id,
      toUserId: requesterId,
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: [friendAcceptNotices.fromUserId, friendAcceptNotices.toUserId],
      set: { seenAt: null, createdAt: now },
    });
  void deliverFriendAlert(database, requesterId, {
    title: copy.title,
    body: copy.body,
    tag: `habitquest-friend-accept-${user.id}`,
    url: "/friends",
  }).catch(() => {
    // The friendship is already saved. A slow push gateway must not hold the page.
  });

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
  await database
    .delete(friendAcceptNotices)
    .where(
      or(
        and(eq(friendAcceptNotices.fromUserId, user.id), eq(friendAcceptNotices.toUserId, friendUserId)),
        and(eq(friendAcceptNotices.fromUserId, friendUserId), eq(friendAcceptNotices.toUserId, user.id)),
      ),
    );
  await database
    .delete(friendStreakNotices)
    .where(
      or(
        and(eq(friendStreakNotices.fromUserId, user.id), eq(friendStreakNotices.toUserId, friendUserId)),
        and(eq(friendStreakNotices.fromUserId, friendUserId), eq(friendStreakNotices.toUserId, user.id)),
      ),
    );
  await database
    .delete(friendCheers)
    .where(
      or(
        and(eq(friendCheers.fromUserId, user.id), eq(friendCheers.toUserId, friendUserId)),
        and(eq(friendCheers.fromUserId, friendUserId), eq(friendCheers.toUserId, user.id)),
      ),
    );
  return getFriendsAction();
}

export async function blockFriendAction(otherUserId: string) {
  const user = await getCurrentUser();
  if (!user || otherUserId === user.id) {
    return { ok: false as const, error: user ? "Friend not found." : "Sign in required." };
  }

  const database = await ensureDatabase();
  const pair = orderUserPair(user.id, otherUserId);
  const [row] = await database
    .select()
    .from(friendships)
    .where(and(eq(friendships.userLowId, pair.low), eq(friendships.userHighId, pair.high)))
    .limit(1);

  if (!row || (row.status !== "accepted" && row.status !== "pending")) {
    if (row?.status === "blocked") {
      return {
        ok: false as const,
        error: row.blockedBy === user.id ? "You already blocked them." : "You can't reach this adventurer.",
      };
    }
    return { ok: false as const, error: "Friend not found." };
  }

  await database
    .update(friendships)
    .set({
      status: "blocked",
      blockedBy: user.id,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(friendships.id, row.id));

  await database
    .delete(friendNudges)
    .where(
      or(
        and(eq(friendNudges.fromUserId, user.id), eq(friendNudges.toUserId, otherUserId)),
        and(eq(friendNudges.fromUserId, otherUserId), eq(friendNudges.toUserId, user.id)),
      ),
    );
  await database
    .delete(friendFinishNotices)
    .where(
      or(
        and(eq(friendFinishNotices.fromUserId, user.id), eq(friendFinishNotices.toUserId, otherUserId)),
        and(eq(friendFinishNotices.fromUserId, otherUserId), eq(friendFinishNotices.toUserId, user.id)),
      ),
    );
  await database
    .delete(friendAcceptNotices)
    .where(
      or(
        and(eq(friendAcceptNotices.fromUserId, user.id), eq(friendAcceptNotices.toUserId, otherUserId)),
        and(eq(friendAcceptNotices.fromUserId, otherUserId), eq(friendAcceptNotices.toUserId, user.id)),
      ),
    );
  await database
    .delete(friendStreakNotices)
    .where(
      or(
        and(eq(friendStreakNotices.fromUserId, user.id), eq(friendStreakNotices.toUserId, otherUserId)),
        and(eq(friendStreakNotices.fromUserId, otherUserId), eq(friendStreakNotices.toUserId, user.id)),
      ),
    );
  await database
    .delete(friendCheers)
    .where(
      or(
        and(eq(friendCheers.fromUserId, user.id), eq(friendCheers.toUserId, otherUserId)),
        and(eq(friendCheers.fromUserId, otherUserId), eq(friendCheers.toUserId, user.id)),
      ),
    );

  return getFriendsAction();
}

export async function unblockFriendAction(otherUserId: string) {
  const user = await getCurrentUser();
  if (!user || otherUserId === user.id) {
    return { ok: false as const, error: user ? "Friend not found." : "Sign in required." };
  }

  const database = await ensureDatabase();
  const pair = orderUserPair(user.id, otherUserId);
  const [row] = await database
    .select()
    .from(friendships)
    .where(and(eq(friendships.userLowId, pair.low), eq(friendships.userHighId, pair.high)))
    .limit(1);

  if (!row || row.status !== "blocked" || row.blockedBy !== user.id) {
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

export async function cheerFriendAction(friendUserId: string) {
  const user = await getCurrentUser();
  if (!user || !friendUserId || friendUserId === user.id) {
    return { ok: false as const, error: user ? "Friend not found." : "Sign in required." };
  }

  const database = await ensureDatabase();
  const pair = orderUserPair(user.id, friendUserId);
  const [row] = await database
    .select({ status: friendships.status, blockedBy: friendships.blockedBy })
    .from(friendships)
    .where(and(eq(friendships.userLowId, pair.low), eq(friendships.userHighId, pair.high)))
    .limit(1);

  if (!row || row.status !== "accepted") {
    if (row?.status === "blocked" && row.blockedBy !== user.id) {
      return { ok: false as const, error: "You can't reach this adventurer." };
    }
    return { ok: false as const, error: "Friend not found." };
  }

  const today = await loadToday(database, [friendUserId]);
  const progress = today.get(friendUserId) ?? { done: 0, due: 0, dateKey: "" };
  if (progress.done < 1 || !progress.dateKey) {
    return { ok: false as const, error: "They haven't finished a habit today." };
  }

  const inserted = await database
    .insert(friendCheers)
    .values({
      fromUserId: user.id,
      toUserId: friendUserId,
      localDate: progress.dateKey,
      createdAt: new Date().toISOString(),
    })
    .onConflictDoNothing()
    .returning({ toUserId: friendCheers.toUserId });

  if (!inserted.length) {
    return { ok: false as const, error: "You already cheered them today." };
  }

  const [account] = await database
    .select({ accountName: users.displayName, settingsName: userSettings.displayName })
    .from(users)
    .leftJoin(userSettings, eq(users.id, userSettings.userId))
    .where(eq(users.id, user.id))
    .limit(1);
  const copy = buildCheerCopy(resolveDisplayName(account?.accountName, account?.settingsName));
  const delivery = await deliverFriendAlert(database, friendUserId, {
    title: copy.title,
    body: copy.body,
    tag: `habitquest-cheer-${user.id}-${progress.dateKey}`,
    url: "/friends",
  });

  return { ok: true as const, cheer: "sent" as const, delivery };
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

export async function getIncomingFriendRequestAlertsAction() {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const database = await ensureDatabase();
  const rows = await database
    .select({
      fromUserId: friendships.requestedBy,
      accountName: users.displayName,
      settingsName: userSettings.displayName,
    })
    .from(friendships)
    .innerJoin(users, eq(friendships.requestedBy, users.id))
    .leftJoin(userSettings, eq(friendships.requestedBy, userSettings.userId))
    .where(
      and(
        or(eq(friendships.userLowId, user.id), eq(friendships.userHighId, user.id)),
        eq(friendships.status, "pending"),
        ne(friendships.requestedBy, user.id),
        isNull(friendships.alertSeenAt),
      ),
    );

  return {
    ok: true as const,
    requests: rows.map((row) => {
      const copy = buildFriendRequestCopy(resolveDisplayName(row.accountName, row.settingsName));
      return {
        fromUserId: row.fromUserId,
        title: copy.title,
        body: copy.body,
      };
    }),
  };
}

export async function markFriendRequestAlertSeenAction(fromUserId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const database = await ensureDatabase();
  const pair = orderUserPair(user.id, fromUserId);
  await database
    .update(friendships)
    .set({ alertSeenAt: new Date().toISOString() })
    .where(
      and(
        eq(friendships.userLowId, pair.low),
        eq(friendships.userHighId, pair.high),
        eq(friendships.status, "pending"),
        eq(friendships.requestedBy, fromUserId),
      ),
    );

  return { ok: true as const };
}

export async function getIncomingFinishNoticesAction() {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const database = await ensureDatabase();
  const rows = await database
    .select({
      fromUserId: friendFinishNotices.fromUserId,
      accountName: users.displayName,
      settingsName: userSettings.displayName,
    })
    .from(friendFinishNotices)
    .innerJoin(users, eq(friendFinishNotices.fromUserId, users.id))
    .leftJoin(userSettings, eq(friendFinishNotices.fromUserId, userSettings.userId))
    .where(and(eq(friendFinishNotices.toUserId, user.id), isNull(friendFinishNotices.seenAt)));

  return {
    ok: true as const,
    finishes: rows.map((row) => {
      const copy = buildFinishCopy(resolveDisplayName(row.accountName, row.settingsName));
      return {
        fromUserId: row.fromUserId,
        title: copy.title,
        body: copy.body,
      };
    }),
  };
}

export async function markFinishNoticeSeenAction(fromUserId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const database = await ensureDatabase();
  await database
    .update(friendFinishNotices)
    .set({ seenAt: new Date().toISOString() })
    .where(and(eq(friendFinishNotices.toUserId, user.id), eq(friendFinishNotices.fromUserId, fromUserId)));

  return { ok: true as const };
}

export async function getIncomingAcceptNoticesAction() {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const database = await ensureDatabase();
  const rows = await database
    .select({
      fromUserId: friendAcceptNotices.fromUserId,
      accountName: users.displayName,
      settingsName: userSettings.displayName,
    })
    .from(friendAcceptNotices)
    .innerJoin(users, eq(friendAcceptNotices.fromUserId, users.id))
    .leftJoin(userSettings, eq(friendAcceptNotices.fromUserId, userSettings.userId))
    .where(and(eq(friendAcceptNotices.toUserId, user.id), isNull(friendAcceptNotices.seenAt)));

  return {
    ok: true as const,
    accepts: rows.map((row) => {
      const copy = buildAcceptCopy(resolveDisplayName(row.accountName, row.settingsName));
      return {
        fromUserId: row.fromUserId,
        title: copy.title,
        body: copy.body,
      };
    }),
  };
}

export async function markAcceptNoticeSeenAction(fromUserId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const database = await ensureDatabase();
  await database
    .update(friendAcceptNotices)
    .set({ seenAt: new Date().toISOString() })
    .where(and(eq(friendAcceptNotices.toUserId, user.id), eq(friendAcceptNotices.fromUserId, fromUserId)));

  return { ok: true as const };
}

export async function getIncomingStreakNoticesAction() {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const database = await ensureDatabase();
  const rows = await database
    .select({
      fromUserId: friendStreakNotices.fromUserId,
      streak: friendStreakNotices.streak,
      accountName: users.displayName,
      settingsName: userSettings.displayName,
    })
    .from(friendStreakNotices)
    .innerJoin(users, eq(friendStreakNotices.fromUserId, users.id))
    .leftJoin(userSettings, eq(friendStreakNotices.fromUserId, userSettings.userId))
    .where(and(eq(friendStreakNotices.toUserId, user.id), isNull(friendStreakNotices.seenAt)))
    .orderBy(desc(friendStreakNotices.createdAt));

  return {
    ok: true as const,
    streaks: rows.map((row) => {
      const copy = buildStreakCopy(resolveDisplayName(row.accountName, row.settingsName), row.streak);
      return {
        fromUserId: row.fromUserId,
        streak: row.streak,
        title: copy.title,
        body: copy.body,
      };
    }),
  };
}

export async function markStreakNoticeSeenAction(fromUserId: string, streak: number) {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }
  if (!isFriendStreakMilestone(streak)) {
    return { ok: false as const, error: "Notice not found." };
  }

  const database = await ensureDatabase();
  await database
    .update(friendStreakNotices)
    .set({ seenAt: new Date().toISOString() })
    .where(
      and(
        eq(friendStreakNotices.toUserId, user.id),
        eq(friendStreakNotices.fromUserId, fromUserId),
        eq(friendStreakNotices.streak, streak),
        isNull(friendStreakNotices.seenAt),
      ),
    );

  return { ok: true as const };
}

export async function getFriendInboxAction() {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const database = await ensureDatabase();
  const unseenForMe = and(eq(friendNudges.toUserId, user.id), isNull(friendNudges.seenAt));
  const [nudgeRows, requestRows, acceptRows, finishRows, streakRows, cheerRows] = await Promise.all([
    database
      .select({
        fromUserId: friendNudges.fromUserId,
        localDate: friendNudges.localDate,
        accountName: users.displayName,
        settingsName: userSettings.displayName,
      })
      .from(friendNudges)
      .innerJoin(users, eq(friendNudges.fromUserId, users.id))
      .leftJoin(userSettings, eq(friendNudges.fromUserId, userSettings.userId))
      .where(unseenForMe)
      .limit(1),
    database
      .select({
        fromUserId: friendships.requestedBy,
        accountName: users.displayName,
        settingsName: userSettings.displayName,
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.requestedBy, users.id))
      .leftJoin(userSettings, eq(friendships.requestedBy, userSettings.userId))
      .where(
        and(
          or(eq(friendships.userLowId, user.id), eq(friendships.userHighId, user.id)),
          eq(friendships.status, "pending"),
          ne(friendships.requestedBy, user.id),
          isNull(friendships.alertSeenAt),
        ),
      )
      .limit(1),
    database
      .select({
        fromUserId: friendAcceptNotices.fromUserId,
        accountName: users.displayName,
        settingsName: userSettings.displayName,
      })
      .from(friendAcceptNotices)
      .innerJoin(users, eq(friendAcceptNotices.fromUserId, users.id))
      .leftJoin(userSettings, eq(friendAcceptNotices.fromUserId, userSettings.userId))
      .where(and(eq(friendAcceptNotices.toUserId, user.id), isNull(friendAcceptNotices.seenAt)))
      .limit(1),
    database
      .select({
        fromUserId: friendFinishNotices.fromUserId,
        accountName: users.displayName,
        settingsName: userSettings.displayName,
      })
      .from(friendFinishNotices)
      .innerJoin(users, eq(friendFinishNotices.fromUserId, users.id))
      .leftJoin(userSettings, eq(friendFinishNotices.fromUserId, userSettings.userId))
      .where(and(eq(friendFinishNotices.toUserId, user.id), isNull(friendFinishNotices.seenAt)))
      .limit(1),
    database
      .select({
        fromUserId: friendStreakNotices.fromUserId,
        streak: friendStreakNotices.streak,
        accountName: users.displayName,
        settingsName: userSettings.displayName,
      })
      .from(friendStreakNotices)
      .innerJoin(users, eq(friendStreakNotices.fromUserId, users.id))
      .leftJoin(userSettings, eq(friendStreakNotices.fromUserId, userSettings.userId))
      .where(and(eq(friendStreakNotices.toUserId, user.id), isNull(friendStreakNotices.seenAt)))
      .orderBy(desc(friendStreakNotices.createdAt))
      .limit(1),
    database
      .select({
        fromUserId: friendCheers.fromUserId,
        accountName: users.displayName,
        settingsName: userSettings.displayName,
      })
      .from(friendCheers)
      .innerJoin(users, eq(friendCheers.fromUserId, users.id))
      .leftJoin(userSettings, eq(friendCheers.fromUserId, userSettings.userId))
      .where(and(eq(friendCheers.toUserId, user.id), isNull(friendCheers.seenAt)))
      .orderBy(desc(friendCheers.createdAt))
      .limit(1),
  ]);

  const nudgeRow = nudgeRows[0];
  let nudge: { fromUserId: string; localDate: string; title: string; body: string } | null = null;
  if (nudgeRow) {
    const today = await loadToday(database, [user.id]);
    const progress = today.get(user.id) ?? { done: 0, due: 0, dateKey: "" };
    const copy = buildNudgeCopy(
      resolveDisplayName(nudgeRow.accountName, nudgeRow.settingsName),
      Math.max(0, progress.due - progress.done),
    );
    nudge = {
      fromUserId: nudgeRow.fromUserId,
      localDate: nudgeRow.localDate,
      title: copy.title,
      body: copy.body,
    };
  }

  const requestRow = requestRows[0];
  const acceptRow = acceptRows[0];
  const finishRow = finishRows[0];
  const streakRow = streakRows[0];
  const cheerRow = cheerRows[0];

  return {
    ok: true as const,
    nudge,
    request: requestRow
      ? {
          fromUserId: requestRow.fromUserId,
          ...buildFriendRequestCopy(resolveDisplayName(requestRow.accountName, requestRow.settingsName)),
        }
      : null,
    accept: acceptRow
      ? {
          fromUserId: acceptRow.fromUserId,
          ...buildAcceptCopy(resolveDisplayName(acceptRow.accountName, acceptRow.settingsName)),
        }
      : null,
    finish: finishRow
      ? {
          fromUserId: finishRow.fromUserId,
          ...buildFinishCopy(resolveDisplayName(finishRow.accountName, finishRow.settingsName)),
        }
      : null,
    streak: streakRow
      ? {
          fromUserId: streakRow.fromUserId,
          streak: streakRow.streak,
          ...buildStreakCopy(resolveDisplayName(streakRow.accountName, streakRow.settingsName), streakRow.streak),
        }
      : null,
    cheer: cheerRow
      ? {
          fromUserId: cheerRow.fromUserId,
          ...buildCheerCopy(resolveDisplayName(cheerRow.accountName, cheerRow.settingsName)),
        }
      : null,
  };
}

export async function markCheerNoticeSeenAction(fromUserId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const database = await ensureDatabase();
  await database
    .update(friendCheers)
    .set({ seenAt: new Date().toISOString() })
    .where(
      and(
        eq(friendCheers.toUserId, user.id),
        eq(friendCheers.fromUserId, fromUserId),
        isNull(friendCheers.seenAt),
      ),
    );

  return { ok: true as const };
}

export async function getFriendProfileAction(friendUserId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }
  if (!friendUserId || friendUserId === user.id) {
    return { ok: false as const, error: "Friend not found." };
  }

  const database = await ensureDatabase();
  const pair = orderUserPair(user.id, friendUserId);
  const [friendship] = await database
    .select({ status: friendships.status, blockedBy: friendships.blockedBy })
    .from(friendships)
    .where(and(eq(friendships.userLowId, pair.low), eq(friendships.userHighId, pair.high)))
    .limit(1);
  if (friendship?.status === "blocked" && friendship.blockedBy !== user.id) {
    return { ok: false as const, error: "You can't reach this adventurer." };
  }

  const [row] = await database
    .select({
      userId: users.id,
      uid: users.uid,
      accountName: users.displayName,
      settingsName: userSettings.displayName,
      level: userProgress.level,
      totalExp: userProgress.totalExp,
      currentStreak: userProgress.currentStreak,
      bestStreak: userProgress.bestStreak,
      avatarItemId: equippedCosmetics.avatarItemId,
      frameItemId: equippedCosmetics.frameItemId,
      titleItemId: equippedCosmetics.titleItemId,
      seasonPassCompletions: rewardSystems.seasonPassCompletions,
    })
    .from(users)
    .leftJoin(userSettings, eq(users.id, userSettings.userId))
    .leftJoin(userProgress, eq(users.id, userProgress.userId))
    .leftJoin(equippedCosmetics, eq(users.id, equippedCosmetics.userId))
    .leftJoin(rewardSystems, eq(users.id, rewardSystems.userId))
    .where(eq(users.id, friendUserId))
    .limit(1);
  if (!row) {
    return { ok: false as const, error: "Friend not found." };
  }

  const activityRows = await database
    .select({ date: habitCompletions.date })
    .from(habitCompletions)
    .where(eq(habitCompletions.userId, friendUserId));

  const profile: FriendProfileView = {
    userId: row.userId,
    displayName: resolveDisplayName(row.accountName, row.settingsName),
    uid: formatUid(row.uid),
    level: row.level ?? 1,
    totalExp: row.totalExp ?? 0,
    currentStreak: row.currentStreak ?? 0,
    bestStreak: row.bestStreak ?? 0,
    avatarItemId: row.avatarItemId,
    frameItemId: row.frameItemId,
    titleItemId: row.titleItemId,
    seasonPassCompletions: row.seasonPassCompletions ?? 0,
    activityDates: activityRows.map((entry) => entry.date),
  };

  return { ok: true as const, profile };
}
