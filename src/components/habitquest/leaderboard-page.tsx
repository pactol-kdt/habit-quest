"use client";

import { useEffect, useState, useTransition } from "react";
import type { LevelLeaderboardEntry } from "~/app/actions/leaderboard";
import { getLeaderboardRequest } from "~/lib/v1/requests";
import { AvatarWithFrame } from "~/components/habitquest/cosmetic-art";
import { GlassCard } from "~/components/habitquest/glass-card";
import { StreakFlame } from "~/components/habitquest/streak-flame";
import { PAGE_HEROES } from "~/lib/habitquest/copy";
import { getBuiltinCatalog } from "~/lib/habitquest/catalog";
import { getStreakFireTier } from "~/lib/habitquest/streak-fire-tier";
import { cn } from "~/lib/ui/cn";
import { formatNumber } from "~/lib/habitquest/utils";
import { useHabitQuestStore } from "~/store/habitquest-store";
import type { ShopItem } from "~/types/habitquest";

function resolveCosmetic(itemId: string | null): ShopItem | null {
  if (!itemId) {
    return null;
  }
  return getBuiltinCatalog().shopItems.find((item) => item.id === itemId) ?? null;
}

function RankBadge({ rank }: { rank: number }) {
  const tone =
    rank === 1
      ? "border-amber-300/30 bg-amber-300/15 text-amber-100"
      : rank === 2
        ? "border-slate-200/25 bg-slate-200/10 text-slate-100"
        : rank === 3
          ? "border-orange-300/25 bg-orange-300/10 text-orange-100"
          : "border-white/10 bg-white/5 text-[var(--color-text-muted)]";

  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-sm font-semibold",
        tone,
      )}
    >
      {rank}
    </div>
  );
}

function LeaderboardRow({ entry }: { entry: LevelLeaderboardEntry }) {
  const avatar = resolveCosmetic(entry.avatarItemId);
  const frame = resolveCosmetic(entry.frameItemId);
  const title = resolveCosmetic(entry.titleItemId);
  const tier = getStreakFireTier(entry.currentStreak);

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-3 overflow-hidden rounded-3xl border px-4 py-3",
        entry.isYou
          ? "border-cyan-300/30 bg-cyan-300/10"
          : "border-white/10 bg-white/4",
      )}
    >
      <RankBadge rank={entry.rank} />
      <AvatarWithFrame
        avatar={avatar}
        frame={frame}
        className="h-11 w-11 shrink-0 border border-white/10"
      />
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate font-semibold text-white">{entry.displayName}</p>
          {entry.isYou ? (
            <span className="shrink-0 text-xs font-normal uppercase tracking-[0.18em] text-cyan-200">
              You
            </span>
          ) : null}
        </div>
        {title?.name ? (
          <p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">{title.name}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2.5 pl-1">
        <StreakFlame tier={tier} size="sm" />
        <div className="text-right">
          <p className="text-lg font-semibold tabular-nums text-white">
            {entry.currentStreak}
            <span className="ml-1 text-sm font-medium text-orange-100/85">d</span>
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Best {entry.bestStreak}d
          </p>
        </div>
      </div>
    </div>
  );
}

export function LeaderboardPage() {
  const authUser = useHabitQuestStore((state) => state.authUser);
  const [entries, setEntries] = useState<LevelLeaderboardEntry[]>([]);
  const [you, setYou] = useState<LevelLeaderboardEntry | null>(null);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function load() {
    startTransition(async () => {
      const result = await getLeaderboardRequest();
      if (!result.ok) {
        setError(result.error);
        setEntries([]);
        setYou(null);
        setTotalPlayers(0);
        return;
      }

      setError(null);
      setEntries(result.entries);
      setYou(result.you);
      setTotalPlayers(result.totalPlayers);
    });
  }

  useEffect(() => {
    load();
  }, []);

  const youOutsideTop =
    you != null && !entries.some((entry) => entry.userId === you.userId);
  const yourTitle = you ? resolveCosmetic(you.titleItemId) : null;
  const yourTier = you ? getStreakFireTier(you.currentStreak) : null;
  const hero = PAGE_HEROES.leaderboard;

  return (
    <div className="grid gap-4 pt-4 md:gap-6 md:pt-6">
      <GlassCard className="overflow-hidden rounded-[1.75rem] p-4 md:rounded-[2rem] md:p-8">
        <div className="grid gap-8 xl:grid-cols-[1.35fr_0.85fr]">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
              {hero.eyebrow}
            </p>
            <h1 className="section-title mt-2 text-2xl text-white sm:text-4xl md:text-5xl">
              {hero.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)] md:text-base md:leading-7">
              {hero.support}
            </p>
            <button
              type="button"
              onClick={load}
              disabled={pending}
              className="mt-5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white disabled:opacity-50"
            >
              {pending ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          <div className="min-w-0 overflow-hidden rounded-[1.75rem] border border-cyan-300/20 bg-gradient-to-br from-cyan-400/10 via-sky-300/5 to-transparent p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/80">Your standing</p>
            {you && yourTier ? (
              <div className="mt-3 flex min-w-0 items-center gap-4">
                <AvatarWithFrame
                  avatar={resolveCosmetic(you.avatarItemId)}
                  frame={resolveCosmetic(you.frameItemId)}
                  className="h-14 w-14 shrink-0 border border-cyan-300/20"
                />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <h2 className="text-2xl font-semibold text-white md:text-3xl">
                    Rank #{you.rank}
                  </h2>
                  <p className="mt-1 truncate text-sm font-medium text-white">
                    {you.displayName}
                  </p>
                  {yourTitle?.name ? (
                    <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
                      {yourTitle.name}
                    </p>
                  ) : null}
                  <div className="mt-2 flex min-w-0 items-center gap-2">
                    <StreakFlame tier={yourTier} size="sm" />
                    <p className="min-w-0 truncate text-sm">
                      <span className="font-semibold text-white">
                        {you.currentStreak}-day streak
                      </span>
                      <span className="text-[var(--color-text-muted)]">
                        {" "}
                        · Best {you.bestStreak}d
                      </span>
                    </p>
                  </div>
                  <p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">
                    {formatNumber(you.totalExp)} EXP among {totalPlayers} players
                  </p>
                </div>
              </div>
            ) : (
              <>
                <h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">Unranked</h2>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                  Sync progress once to appear on the board.
                </p>
              </>
            )}
          </div>
        </div>
      </GlassCard>

      <GlassCard className="overflow-hidden rounded-[1.75rem]">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
              Top adventurers
            </p>
            <h2 className="section-title mt-2 text-2xl text-white">By streak</h2>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">
            Showing {entries.length}
            {totalPlayers > entries.length ? ` of ${totalPlayers}` : ""}
          </p>
        </div>

        {error ? (
          <p className="rounded-3xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
            {!authUser
              ? "Rankings are account-only. Sign in from Settings to appear on the board."
              : error}
          </p>
        ) : pending && entries.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse rounded-3xl border border-white/10 bg-white/5"
              />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="rounded-3xl border border-white/10 bg-white/4 px-4 py-6 text-sm text-[var(--color-text-muted)]">
            No synced adventurers yet. Complete habits and sync to claim the first rank.
          </p>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <LeaderboardRow key={entry.userId} entry={entry} />
            ))}
          </div>
        )}

        {youOutsideTop && you ? (
          <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
              Your position
            </p>
            <LeaderboardRow entry={you} />
          </div>
        ) : null}
      </GlassCard>
    </div>
  );
}
