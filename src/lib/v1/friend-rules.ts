export const UID_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const UID_PATTERN = new RegExp(`^[${UID_ALPHABET}]{8}$`);

export type NudgeState = "available" | "sent" | "done" | "no-push";

export type FriendCard = {
  userId: string;
  displayName: string;
  level: number;
  totalExp: number;
  currentStreak: number;
  bestStreak: number;
  avatarItemId: string | null;
  frameItemId: string | null;
  titleItemId: string | null;
  today: { done: number; due: number };
  nudge: NudgeState;
  /** Hidden until they finish a habit today. Sent means you already cheered them. */
  cheer: "hidden" | "available" | "sent";
};

export type FriendProfileView = {
  userId: string;
  displayName: string;
  uid: string;
  level: number;
  totalExp: number;
  currentStreak: number;
  bestStreak: number;
  avatarItemId: string | null;
  frameItemId: string | null;
  titleItemId: string | null;
  seasonPassCompletions: number;
  /** Completion dates only. Habit names are not included. */
  activityDates: string[];
};

export const FRIEND_STREAK_MILESTONES = [7, 14, 30] as const;

export function isFriendStreakMilestone(streak: number) {
  return (FRIEND_STREAK_MILESTONES as readonly number[]).includes(streak);
}

export type FriendActivityItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  /** Set when this row is today's finish and you can answer it. */
  cheerUserId?: string;
  cheerSent?: boolean;
};

export type FriendLookupRelation = "none" | "friends" | "outgoing" | "incoming" | "blocked";

export type FriendLookupPreview = {
  userId: string;
  displayName: string;
  uid: string;
  level: number;
  avatarItemId: string | null;
  frameItemId: string | null;
  titleItemId: string | null;
  relation: FriendLookupRelation;
};

export type BlockedPerson = {
  userId: string;
  displayName: string;
  avatarItemId: string | null;
  frameItemId: string | null;
};

export type FriendRequestCard = {
  requestId: string;
  userId: string;
  displayName: string;
  avatarItemId: string | null;
  frameItemId: string | null;
  direction: "incoming" | "outgoing";
};

export function normalizeUid(input: string) {
  const compact = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return UID_PATTERN.test(compact) ? compact : null;
}

export function formatUid(uid: string) {
  const compact = uid.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.length !== 8) {
    return compact;
  }
  return `${compact.slice(0, 4)}-${compact.slice(4)}`;
}

export function orderUserPair(a: string, b: string) {
  return a < b ? { low: a, high: b } : { low: b, high: a };
}

export function nudgeAvailability(input: {
  done: number;
  due: number;
  alreadyNudged: boolean;
  hasPush: boolean;
}): NudgeState {
  if (input.done >= input.due) {
    return "done";
  }
  if (input.alreadyNudged) {
    return "sent";
  }
  if (!input.hasPush) {
    return "no-push";
  }
  return "available";
}

export function buildCheerCopy(senderName: string) {
  const name = senderName.trim() || "A friend";
  return {
    title: `${name} cheered you on`,
    body: "Nice work today.",
  };
}

export function buildFinishCopy(senderName: string) {
  const name = senderName.trim() || "A friend";
  return {
    title: `${name} completed a habit today`,
    body: "One habit is done.",
  };
}

export function buildStreakCopy(senderName: string, streak: number) {
  const name = senderName.trim() || "A friend";
  return {
    title: `${name} reached a ${streak}-day streak`,
    body: `${streak} days in a row.`,
  };
}

export function buildActivityNudgeCopy(senderName: string, stillToday: boolean) {
  const name = senderName.trim() || "A friend";
  if (stillToday) {
    return {
      title: `${name} asked you to finish today`,
      body: "Today's habits are still open.",
    };
  }
  return {
    title: `${name} asked you to finish a day`,
    body: "That day has passed.",
  };
}

export function buildAcceptCopy(senderName: string) {
  const name = senderName.trim() || "A friend";
  return {
    title: `${name} accepted your friend request`,
    body: "You're friends now.",
  };
}

export function buildFriendRequestCopy(senderName: string) {
  const name = senderName.trim() || "A friend";
  return {
    title: `${name} sent a friend request`,
    body: "Open Friends to accept or decline.",
  };
}

export function buildNudgeCopy(senderName: string, remaining: number) {
  const name = senderName.trim() || "A friend";
  const open = Math.max(0, remaining);
  const body =
    open === 1 ? "1 habit still open today." : `${open} habits still open today.`;
  return {
    title: `${name} asked you to finish today`,
    body,
  };
}
