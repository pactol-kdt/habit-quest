"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { BlockedPerson, FriendActivityItem, FriendCard, FriendRequestCard } from "~/lib/v1/friend-rules";
import { getFriendsRequest, getIncomingFriendRequestCountRequest } from "~/lib/v1/requests";
import { useHabitQuestStore } from "~/store/habitquest-store";

type FriendsLoadResult =
  | {
      ok: true;
      friends: FriendCard[];
      requests: FriendRequestCard[];
      blocked: BlockedPerson[];
      activity: FriendActivityItem[];
    }
  | { ok: false; error: string };

const FRIENDS_FRESH_MS = 30_000;
const FRIENDS_KEEP_MS = 10 * 60 * 1000;
const STORAGE_KEY = "habitquest.friends.v2";

let cachedCount = 0;
let cachedUserId: string | null = null;
let cachedResult: FriendsLoadResult | null = null;
let cachedAt = 0;
let inflight: Promise<FriendsLoadResult> | null = null;
let countInflight: Promise<void> | null = null;
const listeners = new Set<(count: number) => void>();

type StoredFriends = {
  userId: string;
  at: number;
  result: Extract<FriendsLoadResult, { ok: true }>;
};

function emit(count: number) {
  cachedCount = count;
  for (const listener of listeners) {
    listener(count);
  }
}

export function publishIncomingFriendRequestCount(count: number) {
  emit(count);
}

function writeStored(userId: string, at: number, result: Extract<FriendsLoadResult, { ok: true }>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, at, result } satisfies StoredFriends));
  } catch {
    // A full or private session store should not block the friends list.
  }
}

function readStored(userId: string) {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StoredFriends;
    if (parsed.userId !== userId || !parsed.result?.ok || !Array.isArray(parsed.result.friends)) {
      return null;
    }
    if (Date.now() - parsed.at > FRIENDS_KEEP_MS) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function peekFriendsSnapshot(userId: string) {
  if (cachedResult?.ok && cachedUserId === userId && Date.now() - cachedAt <= FRIENDS_KEEP_MS) {
    return { at: cachedAt, result: cachedResult };
  }
  const stored = readStored(userId);
  if (!stored) {
    return null;
  }
  cachedUserId = userId;
  cachedAt = stored.at;
  cachedResult = stored.result;
  cachedCount = stored.result.requests.filter((request) => request.direction === "incoming").length;
  return { at: stored.at, result: stored.result };
}

export function isFriendsSnapshotFresh(at: number) {
  return Date.now() - at < FRIENDS_FRESH_MS;
}

export function whenFriendsRequestSettles() {
  if (!inflight) {
    return Promise.resolve();
  }
  return inflight.then(
    () => undefined,
    () => undefined,
  );
}

export function rememberFriendsSnapshot(
  userId: string,
  snapshot: {
    friends: FriendCard[];
    requests: FriendRequestCard[];
    blocked?: BlockedPerson[];
    activity?: FriendActivityItem[];
  },
) {
  cachedUserId = userId;
  cachedAt = Date.now();
  cachedResult = {
    ok: true,
    friends: snapshot.friends,
    requests: snapshot.requests,
    blocked: snapshot.blocked ?? [],
    activity: snapshot.activity ?? [],
  };
  writeStored(userId, cachedAt, cachedResult);
  emit(snapshot.requests.filter((request) => request.direction === "incoming").length);
}

export function loadFriendsSnapshot(userId: string, options?: { revalidate?: boolean }) {
  const peeked = peekFriendsSnapshot(userId);
  if (!options?.revalidate && peeked && isFriendsSnapshotFresh(peeked.at)) {
    return Promise.resolve(peeked.result);
  }
  if (inflight) {
    return inflight;
  }
  const startedAt = Date.now();
  inflight = getFriendsRequest()
    .then((result) => {
      if (cachedUserId === userId && cachedAt > startedAt && cachedResult?.ok) {
        return cachedResult;
      }
      cachedUserId = userId;
      cachedAt = Date.now();
      if (!result.ok) {
        cachedResult = { ok: false, error: result.error };
        return cachedResult;
      }
      cachedResult = {
        ok: true,
        friends: result.friends,
        requests: result.requests,
        blocked: result.blocked ?? [],
        activity: result.activity ?? [],
      };
      writeStored(userId, cachedAt, cachedResult);
      emit(cachedResult.requests.filter((request) => request.direction === "incoming").length);
      return cachedResult;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function loadCount() {
  if (countInflight) {
    return countInflight;
  }
  countInflight = getIncomingFriendRequestCountRequest()
    .then((result) => {
      if (result.ok) {
        emit(result.count);
      }
    })
    .finally(() => {
      countInflight = null;
    });
  return countInflight;
}

export function useIncomingFriendRequestCount() {
  const authUserId = useHabitQuestStore((state) => state.authUser?.id ?? null);
  const pathname = usePathname();
  const [count, setCount] = useState(cachedUserId === authUserId ? cachedCount : 0);

  useEffect(() => {
    if (!authUserId) {
      setCount(0);
      return;
    }

    const onChange = (next: number) => setCount(next);
    listeners.add(onChange);
    const peeked = peekFriendsSnapshot(authUserId);
    if (peeked) {
      setCount(peeked.result.requests.filter((request) => request.direction === "incoming").length);
    }
    if (pathname === "/friends") {
      return () => {
        listeners.delete(onChange);
      };
    }
    const timer = window.setTimeout(() => {
      void loadCount();
    }, 1500);
    return () => {
      window.clearTimeout(timer);
      listeners.delete(onChange);
    };
  }, [authUserId, pathname]);

  return count;
}
