"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { AvatarWithFrame } from "~/components/habitquest/cosmetic-art";
import { ConfirmDialog } from "~/components/habitquest/confirm-dialog";
import { GlassCard } from "~/components/habitquest/glass-card";
import { StreakFlame } from "~/components/habitquest/streak-flame";
import { getBuiltinCatalog } from "~/lib/habitquest/catalog";
import { getStreakFireTier } from "~/lib/habitquest/streak-fire-tier";
import { cn } from "~/lib/ui/cn";
import type { FriendCard, FriendRequestCard } from "~/lib/v1/friend-rules";
import {
  acceptFriendRequest,
  declineFriendRequest,
  nudgeFriendRequest,
  removeFriendRequest,
  sendFriendRequest,
} from "~/lib/v1/requests";
import {
  loadFriendsSnapshot,
  publishIncomingFriendRequestCount,
} from "~/hooks/use-incoming-friend-requests";
import { useHabitQuestStore } from "~/store/habitquest-store";
import type { ShopItem } from "~/types/habitquest";

function resolveCosmetic(itemId: string | null): ShopItem | null {
  if (!itemId) {
    return null;
  }
  return getBuiltinCatalog().shopItems.find((item) => item.id === itemId) ?? null;
}

function todayLabel(done: number, due: number) {
  if (due === 0) {
    return "Nothing due today";
  }
  return `${done} of ${due} today`;
}

function nudgeLabel(nudge: FriendCard["nudge"]) {
  if (nudge === "sent") {
    return "Nudged";
  }
  if (nudge === "no-push") {
    return "Push off";
  }
  if (nudge === "done") {
    return "Clear";
  }
  return "Nudge";
}

export function FriendsPanel() {
  const authUser = useHabitQuestStore((state) => state.authUser);
  const [draft, setDraft] = useState("");
  const [friends, setFriends] = useState<FriendCard[]>([]);
  const [requests, setRequests] = useState<FriendRequestCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pushOffFriend, setPushOffFriend] = useState<FriendCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  function apply(result: { friends: FriendCard[]; requests: FriendRequestCard[] }) {
    setFriends(result.friends);
    setRequests(result.requests);
    setError(null);
    publishIncomingFriendRequestCount(
      result.requests.filter((request) => request.direction === "incoming").length,
    );
  }

  function load() {
    const userId = authUser?.id;
    if (!userId) {
      return;
    }
    setLoading(true);
    void loadFriendsSnapshot(userId).then((result) => {
      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      apply(result);
    });
  }

  useEffect(() => {
    if (authUser?.id) {
      load();
    }
    // Reload when the signed-in account changes, not on every store update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  function onAdd(event: FormEvent) {
    event.preventDefault();
    const next = draft.trim();
    if (!next) {
      return;
    }
    startTransition(async () => {
      const result = await sendFriendRequest(next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDraft("");
      apply(result);
    });
  }

  function onAccept(requestId: string) {
    startTransition(async () => {
      const result = await acceptFriendRequest(requestId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      apply(result);
    });
  }

  function onDecline(requestId: string) {
    startTransition(async () => {
      const result = await declineFriendRequest(requestId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      apply(result);
    });
  }

  function onRemove(userId: string) {
    startTransition(async () => {
      const result = await removeFriendRequest(userId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      apply(result);
    });
  }

  function onNudge(friend: FriendCard) {
    startTransition(async () => {
      const result = await nudgeFriendRequest(friend.userId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setNotice(
        result.delivery === "in-app"
          ? "They haven't turned on phone alerts. They'll see the nudge in the app."
          : "Nudge sent.",
      );
      setFriends((current) =>
        current.map((entry) =>
          entry.userId === friend.userId ? { ...entry, nudge: "sent" } : entry,
        ),
      );
    });
  }

  if (!authUser) {
    return (
      <GlassCard className="overflow-hidden rounded-[1.75rem]">
        <p className="rounded-3xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
          Friends are account-only. Open Profile to create an account or sign in.
        </p>
      </GlassCard>
    );
  }

  const incoming = requests.filter((request) => request.direction === "incoming");
  const outgoing = requests.filter((request) => request.direction === "outgoing");

  return (
    <div className="grid gap-4">
      <GlassCard className="overflow-hidden rounded-[1.75rem]">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">Add a friend</p>
        <form onSubmit={onAdd} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value.toUpperCase())}
            placeholder="Friend UID"
            maxLength={12}
            className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-mono tracking-[0.12em] outline-none transition focus:border-cyan-300/50"
          />
          <button
            type="submit"
            disabled={pending || !draft.trim()}
            className="min-h-11 w-full rounded-full hq-btn-accent px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50 sm:w-auto"
          >
            Add
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}
        {notice ? <p className="mt-3 text-sm text-cyan-100">{notice}</p> : null}
      </GlassCard>

      {incoming.length > 0 ? (
        <GlassCard className="overflow-hidden rounded-[1.75rem]">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
            Requests
          </p>
          <div className="mt-4 space-y-3">
            {incoming.map((request) => (
              <div
                key={request.requestId}
                className="grid gap-3 rounded-3xl border border-white/10 bg-white/4 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <AvatarWithFrame
                    avatar={resolveCosmetic(request.avatarItemId)}
                    frame={resolveCosmetic(request.frameItemId)}
                    className="h-11 w-11 shrink-0 border border-white/10"
                  />
                  <p className="min-w-0 flex-1 truncate font-semibold text-white">{request.displayName}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onAccept(request.requestId)}
                    className="min-h-11 rounded-full hq-btn-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onDecline(request.requestId)}
                    className="min-h-11 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-text-muted)] disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      ) : null}

      <GlassCard className="overflow-hidden rounded-[1.75rem]">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">Friends</p>
        <h2 className="section-title mt-2 text-2xl text-white">Today</h2>
        {loading && friends.length === 0 ? (
          <div className="mt-4 h-16 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
        ) : friends.length === 0 ? (
          <p className="mt-4 rounded-3xl border border-white/10 bg-white/4 px-4 py-6 text-sm text-[var(--color-text-muted)]">
            No friends yet. Share your UID or add someone with theirs.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {friends.map((friend) => {
              const tier = getStreakFireTier(friend.currentStreak);
              return (
                <div
                  key={friend.userId}
                  className="grid gap-3 rounded-3xl border border-white/10 bg-white/4 px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <AvatarWithFrame
                      avatar={resolveCosmetic(friend.avatarItemId)}
                      frame={resolveCosmetic(friend.frameItemId)}
                      className="h-11 w-11 shrink-0 border border-white/10"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-white">{friend.displayName}</p>
                      <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
                        {todayLabel(friend.today.done, friend.today.due)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <StreakFlame tier={tier} size="sm" />
                      <span className="text-sm font-semibold text-white">{friend.currentStreak}d</span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    {friend.nudge === "available" || friend.nudge === "no-push" ? (
                      <button
                        type="button"
                        disabled={pending}
                        aria-label={`Notify ${friend.displayName}`}
                        title="Notify"
                        onClick={() => setPushOffFriend(friend)}
                        className="flex h-11 w-11 items-center justify-center rounded-full hq-btn-accent text-slate-950 disabled:opacity-50"
                      >
                        <BellIcon />
                      </button>
                    ) : (
                      <span
                        title={nudgeLabel(friend.nudge)}
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-full border border-white/10",
                          friend.nudge === "sent" ? "text-cyan-100" : "text-[var(--color-text-muted)]",
                        )}
                      >
                        <BellIcon />
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={pending}
                      aria-label={`Remove ${friend.displayName}`}
                      title="Remove"
                      onClick={() => onRemove(friend.userId)}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-[var(--color-text-muted)] disabled:opacity-50"
                    >
                      <RemoveIcon />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {outgoing.length > 0 ? (
          <div className="mt-6 space-y-2 border-t border-white/10 pt-4">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
              Friend request sent
            </p>
            {outgoing.map((request) => (
              <div key={request.requestId} className="flex items-center gap-3 text-sm">
                <p className="min-w-0 flex-1 truncate text-white">{request.displayName}</p>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onDecline(request.requestId)}
                  className="text-[var(--color-text-muted)] disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </GlassCard>

      <ConfirmDialog
        open={pushOffFriend !== null}
        title={pushOffFriend ? `Notify ${pushOffFriend.displayName}?` : "Notify?"}
        description="This sends a push so they finish today's habits. They stay on your friends list."
        onClose={() => setPushOffFriend(null)}
      >
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!pushOffFriend) {
              return;
            }
            const friend = pushOffFriend;
            setPushOffFriend(null);
            onNudge(friend);
          }}
          className="min-h-12 rounded-full hq-btn-accent px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          Notify
        </button>
        <button
          type="button"
          onClick={() => setPushOffFriend(null)}
          className="min-h-12 rounded-full border border-white/10 px-5 py-3 text-sm text-[var(--color-text-muted)] hover:text-white"
        >
          Cancel
        </button>
      </ConfirmDialog>
    </div>
  );
}

function BellIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 7H3s3 0 3-7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 7h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M9 7V5h6v2M8 7l1 12h6l1-12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
