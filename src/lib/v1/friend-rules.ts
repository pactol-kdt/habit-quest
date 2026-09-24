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

export function buildNudgeCopy(senderName: string, remaining: number) {
  const name = senderName.trim() || "A friend";
  const open = Math.max(0, remaining);
  const body =
    open === 1 ? "1 habit still open today." : `${open} habits still open today.`;
  return {
    title: `${name} nudged you`,
    body,
  };
}
