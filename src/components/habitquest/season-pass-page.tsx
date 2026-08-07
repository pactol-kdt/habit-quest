"use client";

import Link from "next/link";
import { GlassCard } from "~/components/habitquest/glass-card";
import { SEASON_PASS_XP_PER_LEVEL, SETTLEMENT_LOCK_HINT } from "~/lib/habitquest/constants";
import { cn } from "~/lib/ui/cn";
import { formatNumber, isFeatureUnlocked } from "~/lib/habitquest/utils";
import { useEffectiveProgress } from "~/hooks/use-effective-progress";
import { useHabitQuestStore } from "~/store/habitquest-store";

export function SeasonPassPage() {
  const {
    seasonPass: settledSeasonPass,
    levelUnlocks,
    claimSeasonPassLevel,
    hydrated,
  } = useHabitQuestStore((state) => state);
  const { seasonPass, pendingSeasonXp } = useEffectiveProgress();

  const seasonUnlocked = isFeatureUnlocked(levelUnlocks, "season-pass");
  const seasonXpIntoLevel = seasonPass.xp % SEASON_PASS_XP_PER_LEVEL;
  const seasonProgressPercent = (seasonXpIntoLevel / SEASON_PASS_XP_PER_LEVEL) * 100;
  // Claims require settled level, not pending preview.
  const claimableSeason = settledSeasonPass.rewards.filter(
    (reward) =>
      settledSeasonPass.level >= reward.level &&
      !settledSeasonPass.claimedLevels.includes(reward.level),
  );

  if (!hydrated) {
    return (
      <div className="grid gap-4 pt-4 md:gap-6 md:pt-6">
        <div className="glass-panel h-64 animate-pulse rounded-[2rem]" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 pt-4 md:gap-6 md:pt-6">
      <GlassCard className="overflow-hidden rounded-[1.75rem] p-4 md:rounded-[2rem] md:p-8">
        <div className="grid gap-8 xl:grid-cols-[1.35fr_0.85fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
              Monthly track
            </p>
            <h1 className="section-title mt-2 text-2xl text-white sm:text-4xl md:text-5xl">
              Season pass
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)] md:text-base md:leading-7">
              Habit clears feed season XP. Today&apos;s XP stays pending — {SETTLEMENT_LOCK_HINT}{" "}
              Claims use settled tiers only. The pass resets each calendar month.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
              >
                Earn XP on dashboard
              </Link>
            </div>
          </div>

          <div
            className={cn(
              "rounded-[1.75rem] border border-cyan-300/20 bg-gradient-to-br from-cyan-400/10 via-sky-300/5 to-transparent p-5",
              !seasonUnlocked && "opacity-70",
            )}
          >
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/80">Current season</p>
            <h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
              {seasonUnlocked ? seasonPass.seasonKey : "Locked"}
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              {seasonUnlocked
                ? `Level ${seasonPass.level} · ${formatNumber(seasonPass.xp)} season XP${
                    pendingSeasonXp > 0 ? ` (${pendingSeasonXp} pending)` : ""
                  }`
                : "Unlocks at level 4"}
            </p>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <GlassCard className={cn("rounded-[1.75rem]", !seasonUnlocked && "opacity-60")}>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
                Progress
              </p>
              <h2 className="section-title mt-2 text-2xl text-white">
                {seasonUnlocked ? `Level ${seasonPass.level}` : "Season locked"}
              </h2>
            </div>
            <p className="text-sm text-cyan-100">
              {seasonUnlocked
                ? `${seasonXpIntoLevel}/${SEASON_PASS_XP_PER_LEVEL} XP to next`
                : "Reach level 4"}
            </p>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="hq-fill-accent h-full rounded-full transition-all"
              style={{ width: `${seasonUnlocked ? seasonProgressPercent : 0}%` }}
            />
          </div>

          {seasonUnlocked && claimableSeason.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {claimableSeason.map((reward) => (
                <button
                  key={reward.level}
                  type="button"
                  onClick={() => claimSeasonPassLevel(reward.level)}
                  className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-300/16"
                >
                  Claim Lv {reward.level} · {reward.label}
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-[var(--color-text-muted)]">
              {seasonUnlocked
                ? pendingSeasonXp > 0 &&
                  seasonPass.level > settledSeasonPass.level
                  ? `Pending season level ${seasonPass.level} — claim unlocks after lock-in. ${SETTLEMENT_LOCK_HINT}`
                  : "No claimable tiers right now — keep clearing habits."
                : "Level up to unlock the monthly season track."}
            </p>
          )}
        </GlassCard>

        <GlassCard className="rounded-[1.75rem]">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
            Tier rewards
          </p>
          <h2 className="section-title mt-2 text-2xl text-white">Reward track</h2>
          <div className="mt-5 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
            {seasonPass.rewards.map((reward) => {
              const reached = seasonPass.level >= reward.level;
              const settledReached = settledSeasonPass.level >= reward.level;
              const claimed = settledSeasonPass.claimedLevels.includes(reward.level);

              return (
                <div
                  key={reward.level}
                  className={cn(
                    "rounded-3xl border px-4 py-3",
                    claimed
                      ? "border-emerald-300/20 bg-emerald-300/8"
                      : settledReached
                        ? "border-cyan-300/20 bg-cyan-300/8"
                        : reached
                          ? "border-amber-300/20 bg-amber-300/8"
                          : "border-white/10 bg-white/4",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">
                        Lv {reward.level} · {reward.label}
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                        +{reward.coins} coins · +{reward.exp} EXP
                      </p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                      {claimed
                        ? "Claimed"
                        : settledReached
                          ? "Ready"
                          : reached
                            ? "Pending"
                            : "Locked"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
