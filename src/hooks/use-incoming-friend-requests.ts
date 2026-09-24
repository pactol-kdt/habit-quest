"use client";

import { useEffect, useState } from "react";
import type { FriendCard, FriendRequestCard } from "~/lib/v1/friend-rules";
import { getFriendsRequest } from "~/lib/v1/requests";
import { useHabitQuestStore } from "~/store/habitquest-store";

type FriendsLoadResult =
  | { ok: true; friends: FriendCard[]; requests: FriendRequestCard[] }
  | { ok: false; error: string };

const FRIENDS_CACHE_MS = 5000;

let cachedCount = 0;
let cachedUserId: string | null = null;
let cachedResult: FriendsLoadResult | null = null;
let cachedAt = 0;
let inflight: Promise<FriendsLoadResult> | null = null;
const listeners = new Set<(count: number) => void>();

function emit(count: number) {
  cachedCount = count;
  for (const listener of listeners) {
    listener(count);
  }
}

export function publishIncomingFriendRequestCount(count: number) {
  emit(count);
}

export function loadFriendsSnapshot(userId: string) {
  if (
    cachedResult?.ok &&
    cachedUserId === userId &&
    Date.now() - cachedAt < FRIENDS_CACHE_MS
  ) {
    return Promise.resolve(cachedResult);
  }
  if (inflight) {
    return inflight;
  }
  inflight = getFriendsRequest()
    .then((result) => {
      cachedUserId = userId;
      cachedAt = Date.now();
      if (!result.ok) {
        cachedResult = { ok: false, error: result.error };
        return cachedResult;
      }
      emit(result.requests.filter((request) => request.direction === "incoming").length);
      cachedResult = {
        ok: true,
        friends: result.friends,
        requests: result.requests,
      };
      return cachedResult;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function loadCount(userId: string) {
  return loadFriendsSnapshot(userId).then(() => undefined);
}

export function useIncomingFriendRequestCount() {
  const authUserId = useHabitQuestStore((state) => state.authUser?.id ?? null);
  const [count, setCount] = useState(cachedUserId === authUserId ? cachedCount : 0);

  useEffect(() => {
    if (!authUserId) {
      setCount(0);
      return;
    }

    const onChange = (next: number) => setCount(next);
    listeners.add(onChange);
    if (cachedUserId === authUserId) {
      setCount(cachedCount);
      return () => {
        listeners.delete(onChange);
      };
    }
    const timer = window.setTimeout(() => {
      void loadCount(authUserId);
    }, 1500);
    return () => {
      window.clearTimeout(timer);
      listeners.delete(onChange);
    };
  }, [authUserId]);

  return count;
}
