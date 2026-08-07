"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getLevelLeaderboardAction,
  type LevelLeaderboardEntry,
} from "~/app/actions/leaderboard";
import { GlassCard } from "~/components/habitquest/glass-card";
import { cn } from "~/lib/ui/cn";
import { formatNumber } from "~/lib/habitquest/utils";

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
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-3xl border px-4 py-3",
        entry.isYou
          ? "border-cyan-300/30 bg-cyan-300/10"
          : "border-white/10 bg-white/4",
      )}
    >
      <RankBadge rank={entry.rank} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-white">
          {entry.displayName}
          {entry.isYou ? (
            <span className="ml-2 text-xs font-normal uppercase tracking-[0.18em] text-cyan-200">
              You
            </span>
          ) : null}
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Streak {entry.currentStreak}d · Best {entry.bestStreak}d
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-lg font-semibold text-white">Lv {entry.level}</p>
        <p className="text-xs text-[var(--color-text-muted)]">
          {formatNumber(entry.totalExp)} EXP
        </p>
      </div>
    </div>
  );
}

export function LeaderboardPage() {
  const [entries, setEntries] = useState<LevelLeaderboardEntry[]>([]);
  const [you, setYou] = useState<LevelLeaderboardEntry | null>(null);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function load() {
    startTransition(async () => {
      const result = await getLevelLeaderboardAction();
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

  return (
    <div className="grid gap-4 pt-4 md:gap-6 md:pt-6">
      <GlassCard className="overflow-hidden rounded-[1.75rem] p-4 md:rounded-[2rem] md:p-8">
        <div className="grid gap-8 xl:grid-cols-[1.35fr_0.85fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
              Global ranks
            </p>
            <h1 className="section-title mt-2 text-2xl text-white sm:text-4xl md:text-5xl">
              Level leaderboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)] md:text-base md:leading-7">
              Adventurers ranked by account level, then total EXP. Rankings update when progress
              syncs to the cloud.
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

          <div className="rounded-[1.75rem] border border-cyan-300/20 bg-gradient-to-br from-cyan-400/10 via-sky-300/5 to-transparent p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/80">Your standing</p>
            {you ? (
              <>
                <h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
                  Rank #{you.rank}
                </h2>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                  Level {you.level} · {formatNumber(you.totalExp)} EXP among {totalPlayers} players
                </p>
              </>
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

      <GlassCard className="rounded-[1.75rem]">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
              Top adventurers
            </p>
            <h2 className="section-title mt-2 text-2xl text-white">By level</h2>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">
            Showing {entries.length}
            {totalPlayers > entries.length ? ` of ${totalPlayers}` : ""}
          </p>
        </div>

        {error ? (
          <p className="rounded-3xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
            {error}
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
