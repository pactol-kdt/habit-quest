"use client";

import { cn } from "~/lib/ui/cn";
import { StreakFlame } from "~/components/habitquest/streak-flame";
import {
  getStreakFireTier,
  streakFireBorderClass,
  streakFireTierLabel,
  type StreakFireTier,
} from "~/lib/habitquest/streak-fire-tier";

interface StreakDisplayProps {
  currentStreak: number;
  bestStreak?: number;
  featured?: boolean;
}

const TIER_LABEL_CLASS: Record<StreakFireTier, string> = {
  dormant: "text-slate-300/80",
  spark: "text-amber-200/90",
  ember: "text-orange-200/90",
  blaze: "text-orange-100/90",
  inferno: "text-rose-200/90",
  legendary: "text-amber-200/90",
  eternal: "text-cyan-200/90",
  apex: "text-pink-200/90",
};

export function StreakDisplay({
  currentStreak,
  bestStreak = 0,
  featured = false,
}: StreakDisplayProps) {
  const tier = getStreakFireTier(currentStreak);
  const tierLabel = streakFireTierLabel(tier);
  const toneClass = TIER_LABEL_CLASS[tier];

  if (featured) {
    return (
      <div className={cn("relative rounded-[1.5rem] md:rounded-[1.75rem]", streakFireBorderClass(tier))}>
        <div className="hq-streak-panel-inner relative overflow-hidden p-4 sm:p-5 md:p-6">
          <div aria-hidden className="hq-streak-blob hq-streak-blob--tr" />
          <div aria-hidden className="hq-streak-blob hq-streak-blob--bl" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4 sm:gap-5">
              <StreakFlame tier={tier} size="lg" />
              <div>
                <p className={cn("text-xs uppercase tracking-[0.28em]", toneClass)}>
                  {tierLabel}
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span
                    className={cn(
                      "section-title text-5xl leading-none sm:text-6xl md:text-7xl",
                      tier === "dormant" ? "text-white/70" : "text-white hq-streak-count-glow",
                    )}
                  >
                    {currentStreak}
                  </span>
                  <span className={cn("pb-1 text-base sm:text-lg", toneClass)}>
                    {currentStreak === 1 ? "day" : "days"}
                  </span>
                </div>
              </div>
            </div>

            {bestStreak > currentStreak ? (
              <div className="text-left sm:text-right">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                  Personal best
                </p>
                <p className="mt-1 text-lg font-semibold text-white sm:text-xl">
                  {bestStreak} {bestStreak === 1 ? "day" : "days"}
                </p>
              </div>
            ) : currentStreak === 0 ? (
              <p className="max-w-xs text-sm leading-6 text-[var(--color-text-muted)] sm:text-right">
                Clear a habit today to start your streak.
              </p>
            ) : (
              <p className={cn("max-w-xs text-sm leading-6 sm:text-right", toneClass)}>
                One clear today keeps the chain alive.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
      <StreakFlame tier={tier} size="sm" />
      <span className="text-white">
        {currentStreak === 0 ? "No active streak" : `${currentStreak}-day streak`}
      </span>
      {tier !== "dormant" ? (
        <span className={toneClass}>· {tierLabel}</span>
      ) : null}
      {bestStreak > currentStreak ? (
        <span className="text-[var(--color-text-muted)]">· Best {bestStreak}d</span>
      ) : null}
    </div>
  );
}
