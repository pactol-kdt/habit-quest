"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { AvatarWithFrame } from "~/components/habitquest/cosmetic-art";
import { ConfirmDialog } from "~/components/habitquest/confirm-dialog";
import { GlassCard } from "~/components/habitquest/glass-card";
import { StreakFlame } from "~/components/habitquest/streak-flame";
import { getBuiltinCatalog } from "~/lib/habitquest/catalog";
import { getStreakFireTier } from "~/lib/habitquest/streak-fire-tier";
import { useDialogA11y } from "~/hooks/use-dialog-a11y";
import { cn } from "~/lib/ui/cn";
import { formatActivityAge } from "~/lib/v1/friend-rules";
import type {
  BlockedPerson,
  FriendActivityItem,
  FriendCard,
  FriendLookupPreview,
  FriendRequestCard,
} from "~/lib/v1/friend-rules";
import {
  acceptFriendRequest,
  blockFriendRequest,
  cheerFriendRequest,
  declineFriendRequest,
  lookupFriendRequest,
  markActivitySeenRequest,
  nudgeFriendRequest,
  removeFriendRequest,
  sendFriendRequest,
  unblockFriendRequest,
} from "~/lib/v1/requests";
import {
  isFriendsSnapshotFresh,
  loadFriendsSnapshot,
  peekFriendsSnapshot,
  publishIncomingFriendRequestCount,
  rememberFriendsSnapshot,
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
  const [previews, setPreviews] = useState<FriendLookupPreview[]>([]);
  const [friends, setFriends] = useState<FriendCard[]>([]);
  const [requests, setRequests] = useState<FriendRequestCard[]>([]);
  const [blocked, setBlocked] = useState<BlockedPerson[]>([]);
  const [activity, setActivity] = useState<FriendActivityItem[]>([]);
  const [activityOpen, setActivityOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pushOffFriend, setPushOffFriend] = useState<FriendCard | null>(null);
  const [blockTarget, setBlockTarget] = useState<{ userId: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  function apply(result: {
    friends: FriendCard[];
    requests: FriendRequestCard[];
    blocked?: BlockedPerson[];
    activity?: FriendActivityItem[];
  }) {
    setFriends(result.friends);
    setRequests(result.requests);
    setBlocked(result.blocked ?? []);
    setActivity(result.activity ?? []);
    setError(null);
    publishIncomingFriendRequestCount(
      result.requests.filter((request) => request.direction === "incoming").length,
    );
    if (authUser?.id) {
      rememberFriendsSnapshot(authUser.id, result);
    }
  }

  function load() {
    const userId = authUser?.id;
    if (!userId) {
      return;
    }
    const cached = peekFriendsSnapshot(userId);
    if (cached?.result.ok) {
      apply(cached.result);
      setLoading(false);
      if (isFriendsSnapshotFresh(cached.at)) {
        return;
      }
    } else {
      setLoading(true);
    }
    void loadFriendsSnapshot(userId).then((result) => {
      setLoading(false);
      if (!result.ok) {
        if (!cached) {
          setError(result.error);
        }
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

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const next = draft.trim();
    if (!next) {
      return;
    }
    startTransition(async () => {
      const result = await lookupFriendRequest(next);
      if (!result.ok) {
        setPreviews([]);
        setNotice(null);
        setError(result.error);
        return;
      }
      setError(null);
      setNotice(null);
      setPreviews(result.previews);
    });
  }

  function onAddPreview(person: FriendLookupPreview) {
    if (person.relation !== "none") {
      return;
    }
    startTransition(async () => {
      const result = await sendFriendRequest(person.uid);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDraft("");
      setPreviews([]);
      setNotice(
        result.delivery === "in-app"
          ? "They haven't turned on phone alerts. They'll see the request in the app."
          : "Friend request sent.",
      );
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

  function onBlock(userId: string) {
    startTransition(async () => {
      const result = await blockFriendRequest(userId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      apply(result);
    });
  }

  function onUnblock(userId: string) {
    startTransition(async () => {
      const result = await unblockFriendRequest(userId);
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

  function onCheer(userId: string) {
    startTransition(async () => {
      const result = await cheerFriendRequest(userId);
      if (!result.ok && result.error !== "You already cheered them today.") {
        setError(result.error);
        return;
      }
      setError(null);
      if (result.ok) {
        setNotice(
          result.delivery === "in-app"
            ? "They haven't turned on phone alerts. They'll see the cheer in the app."
            : "Cheer sent.",
        );
      }
      const nextFriends = friends.map((entry) =>
        entry.userId === userId ? { ...entry, cheer: "sent" as const } : entry,
      );
      const nextActivity = activity.map((item) =>
        item.cheerUserId === userId ? { ...item, cheerSent: true } : item,
      );
      setFriends(nextFriends);
      setActivity(nextActivity);
      if (authUser?.id) {
        rememberFriendsSnapshot(authUser.id, {
          friends: nextFriends,
          requests,
          blocked,
          activity: nextActivity,
        });
      }
    });
  }

  function openActivity() {
    setActivityOpen(true);
    if (!activity.some((item) => item.unseen !== false)) {
      return;
    }
    const nextActivity = activity.map((item) => ({ ...item, unseen: false }));
    setActivity(nextActivity);
    if (authUser?.id) {
      rememberFriendsSnapshot(authUser.id, {
        friends,
        requests,
        blocked,
        activity: nextActivity,
      });
    }
    void markActivitySeenRequest();
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
        <form onSubmit={onSearch} className="mt-4 flex items-center gap-2">
          <input
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setPreviews([]);
            }}
            placeholder="Username or UID"
            maxLength={32}
            className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-cyan-300/50"
          />
          <button
            type="submit"
            disabled={pending || !draft.trim()}
            title="Search"
            aria-label="Search"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hq-btn-accent text-slate-950 disabled:opacity-50"
          >
            <SearchIcon />
          </button>
        </form>
        {previews.length > 0 ? (
          <div className="mt-4 space-y-3">
            {previews.map((person) => (
              <div
                key={person.userId}
                className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/4 px-4 py-3"
              >
                <AvatarWithFrame
                  avatar={resolveCosmetic(person.avatarItemId)}
                  frame={resolveCosmetic(person.frameItemId)}
                  className="h-11 w-11 shrink-0 border border-white/10"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{person.displayName}</p>
                  <p className="truncate text-sm text-[var(--color-text-muted)]">
                    {resolveCosmetic(person.titleItemId)?.name ?? "Unranked"}
                    {previews.length > 1 ? ` · ${person.uid}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {person.relation === "blocked" ? (
                    <span
                      title="You can't add this adventurer."
                      aria-label="You can't add this adventurer."
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-[var(--color-text-muted)]"
                    >
                      <BlockIcon />
                    </span>
                  ) : (
                    <Link
                      href={`/friends/${person.userId}`}
                      prefetch={false}
                      title="View profile"
                      aria-label={`View ${person.displayName}'s profile`}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-white"
                    >
                      <ProfileIcon />
                    </Link>
                  )}
                  {person.relation === "none" ? (
                    <button
                      type="button"
                      disabled={pending}
                      title="Add"
                      aria-label={`Add ${person.displayName}`}
                      onClick={() => onAddPreview(person)}
                      className="flex h-11 w-11 items-center justify-center rounded-full hq-btn-accent text-slate-950 disabled:opacity-50"
                    >
                      <AddIcon />
                    </button>
                  ) : person.relation === "friends" ? (
                    <span
                      title="Already friends"
                      aria-label="Already friends"
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-cyan-100"
                    >
                      <FriendsIcon />
                    </span>
                  ) : person.relation === "outgoing" ? (
                    <span
                      title="Friend request sent."
                      aria-label="Friend request sent."
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-cyan-100"
                    >
                      <SentIcon />
                    </span>
                  ) : person.relation === "incoming" ? (
                    <span
                      title="They already sent you a request."
                      aria-label="They already sent you a request."
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-cyan-100"
                    >
                      <IncomingIcon />
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
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
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    title="Accept"
                    aria-label={`Accept ${request.displayName}`}
                    onClick={() => onAccept(request.requestId)}
                    className="flex h-11 w-11 items-center justify-center rounded-full hq-btn-accent text-slate-950 disabled:opacity-50"
                  >
                    <CheckIcon />
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    title="Decline"
                    aria-label={`Decline ${request.displayName}`}
                    onClick={() => onDecline(request.requestId)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-[var(--color-text-muted)] disabled:opacity-50"
                  >
                    <CloseIcon />
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    title="Block"
                    aria-label={`Block ${request.displayName}`}
                    onClick={() => setBlockTarget({ userId: request.userId, name: request.displayName })}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-[var(--color-text-muted)] disabled:opacity-50"
                  >
                    <BlockIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      ) : null}

      <GlassCard className="overflow-hidden rounded-[1.75rem]">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">Friends</p>
            <h2 className="section-title mt-2 truncate text-2xl text-white">Today</h2>
          </div>
          <ActivityButton
            count={activity.filter((item) => item.unseen !== false).length}
            onClick={openActivity}
          />
        </div>
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
                  className="relative grid gap-3 rounded-3xl border border-white/10 bg-white/4 px-4 py-3 transition hover:border-white/20 hover:bg-white/6"
                >
                  <Link
                    href={`/friends/${friend.userId}`}
                    prefetch={false}
                    aria-label={`View ${friend.displayName}'s profile`}
                    className="absolute inset-0 z-0 rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
                  />
                  <div className="pointer-events-none relative z-10 flex min-w-0 items-center gap-3">
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
                  <div className="relative z-10 flex justify-end gap-2">
                    {(friend.cheer ?? (friend.today.done >= 1 ? "available" : "hidden")) !== "hidden" ? (
                      <CheerButton
                        sent={(friend.cheer ?? "available") === "sent"}
                        pending={pending}
                        label={`Cheer ${friend.displayName}`}
                        onClick={() => onCheer(friend.userId)}
                      />
                    ) : null}
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
                      aria-label={`Block ${friend.displayName}`}
                      title="Block"
                      onClick={() => setBlockTarget({ userId: friend.userId, name: friend.displayName })}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-[var(--color-text-muted)] disabled:opacity-50"
                    >
                      <BlockIcon />
                    </button>
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
                  title="Cancel"
                  aria-label={`Cancel request to ${request.displayName}`}
                  onClick={() => onDecline(request.requestId)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 text-[var(--color-text-muted)] disabled:opacity-50"
                >
                  <CloseIcon />
                </button>
              </div>
            ))}
          </div>
        ) : null}
        {blocked.length > 0 ? (
          <div className="mt-6 space-y-2 border-t border-white/10 pt-4">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-text-muted)]">Blocked</p>
            {blocked.map((person) => (
              <div key={person.userId} className="flex items-center gap-3 text-sm">
                <p className="min-w-0 flex-1 truncate text-white">{person.displayName}</p>
                <button
                  type="button"
                  disabled={pending}
                  title="Unblock"
                  aria-label={`Unblock ${person.displayName}`}
                  onClick={() => onUnblock(person.userId)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 text-white disabled:opacity-50"
                >
                  <UnblockIcon />
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

      <ConfirmDialog
        open={blockTarget !== null}
        title={blockTarget ? `Block ${blockTarget.name}?` : "Block?"}
        description="They leave your list. They can't send a request or a nudge."
        onClose={() => setBlockTarget(null)}
      >
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!blockTarget) {
              return;
            }
            const target = blockTarget;
            setBlockTarget(null);
            onBlock(target.userId);
          }}
          className="min-h-12 rounded-full bg-rose-300 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          Block
        </button>
        <button
          type="button"
          onClick={() => setBlockTarget(null)}
          className="min-h-12 rounded-full border border-white/10 px-5 py-3 text-sm text-[var(--color-text-muted)] hover:text-white"
        >
          Cancel
        </button>
      </ConfirmDialog>
      <ActivityDialog
        open={activityOpen}
        items={activity}
        pending={pending}
        onClose={() => setActivityOpen(false)}
        onCheer={onCheer}
      />
    </div>
  );
}

function ActivityButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Activity"
      aria-label={count > 0 ? `Activity, ${count} new` : "Activity"}
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 text-white"
    >
      <ActivityIcon />
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-300 px-1 text-[10px] font-semibold text-slate-950">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </button>
  );
}

function ActivityDialog({
  open,
  items,
  pending,
  onClose,
  onCheer,
}: {
  open: boolean;
  items: FriendActivityItem[];
  pending: boolean;
  onClose: () => void;
  onCheer: (userId: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted || !open) {
    return null;
  }
  return createPortal(
    <ActivityDialogPanel items={items} pending={pending} onClose={onClose} onCheer={onCheer} />,
    document.body,
  );
}

function ActivityDialogPanel({
  items,
  pending,
  onClose,
  onCheer,
}: {
  items: FriendActivityItem[];
  pending: boolean;
  onClose: () => void;
  onCheer: (userId: string) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogA11y(panelRef, onClose);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-md sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-dialog-title"
        tabIndex={-1}
        className="glass-panel flex max-h-[85vh] w-full max-w-md flex-col rounded-t-[1.5rem] border border-white/10 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] outline-none sm:rounded-[1.75rem] sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <h2 id="activity-dialog-title" className="section-title min-w-0 flex-1 truncate text-2xl text-white">
            Activity
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 text-[var(--color-text-muted)]"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto">
          {items.length === 0 ? (
            <p className="rounded-3xl border border-white/10 bg-white/4 px-4 py-6 text-sm text-[var(--color-text-muted)]">
              No activity yet.
            </p>
          ) : (
            items.map((item) => {
              const age = formatActivityAge(item.createdAt);
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/4 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{item.title}</p>
                    {item.body ? (
                      <p className="mt-1 text-sm text-[var(--color-text-muted)]">{item.body}</p>
                    ) : null}
                    {age ? <p className="mt-1 text-sm text-[var(--color-text-muted)]">{age}</p> : null}
                  </div>
                  {item.cheerUserId ? (
                    <CheerButton
                      sent={item.cheerSent === true}
                      pending={pending}
                      label="Cheer"
                      onClick={() => onCheer(item.cheerUserId!)}
                    />
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m6 12 4 4 8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SentIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m5 12 14-7-4 14-3-5-7-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function IncomingIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16v10H4V7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function UnblockIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 11V8a4 4 0 0 1 7.5-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="6" y="11" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function AddIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M6 18c.7-2.6 2.6-4 6-4s5.3 1.4 6 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FriendsIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3.5 18c.6-2.4 2.4-3.5 5.5-3.5s4.9 1.1 5.5 3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="m16 11 1.5 1.5L21 9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheerButton({
  sent,
  pending,
  label,
  onClick,
}: {
  sent: boolean;
  pending: boolean;
  label: string;
  onClick: () => void;
}) {
  if (sent) {
    return (
      <span
        title="Cheered"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 text-cyan-100"
      >
        <CheerIcon filled />
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={label}
      title="Cheer"
      onClick={onClick}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hq-btn-accent text-slate-950 disabled:opacity-50"
    >
      <CheerIcon />
    </button>
  );
}

function CheerIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} aria-hidden>
      <path
        d="m12 3 2.2 6.6H21l-5.4 4 2.1 6.6L12 16.8 6.3 20.2 8.4 13.6 3 9.6h6.8L12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
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

function BlockIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 17 17 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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
