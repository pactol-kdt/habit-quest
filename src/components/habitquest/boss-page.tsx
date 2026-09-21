"use client";

import Link from "next/link";
import { ChallengeCard } from "~/components/habitquest/challenge-card";
import { GlassCard } from "~/components/habitquest/glass-card";
import { CurrencyAmount } from "~/components/habitquest/icons/currency-amount";
import {
  BOSS_CLEAR_COINS,
  BOSS_CLEAR_EXP,
} from "~/lib/habitquest/constants";
import { PAGE_HEROES } from "~/lib/habitquest/copy";
import { isFeatureUnlocked } from "~/lib/habitquest/utils";
import { useEffectiveProgress } from "~/hooks/use-effective-progress";
import { useHabitQuestStore } from "~/store/habitquest-store";

export function BossPage() {
  const {
    claimBossReward,
    claimChallengeReward,
    pendingClaimIds,
    hydrated,
    challenges,
    shopItems,
    levelUnlocks,
  } = useHabitQuestStore((state) => state);
  const { weeklyBoss } = useEffectiveProgress();
  const claimPending = pendingClaimIds.includes("boss-reward");
  const hero = PAGE_HEROES.boss;

  const bossPercent = weeklyBoss.maxHp
    ? ((weeklyBoss.maxHp - weeklyBoss.effectiveHp) / weeklyBoss.maxHp) * 100
    : 0;
  const statusLabel = weeklyBoss.defeated
    ? weeklyBoss.rewardClaimed
      ? "Cleared"
      : "Reward ready"
    : "In progress";

  const weeklyChallenge = challenges.find((challenge) => challenge.period === "weekly") ?? null;
  const weeklyUnlocked = isFeatureUnlocked(levelUnlocks, "weekly-challenges");
  const weeklyRequiredLevel = levelUnlocks.find(
    (unlock) => unlock.feature === "weekly-challenges",
  )?.requiredLevel;

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
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
          {hero.eyebrow}
        </p>
        <h1 className="section-title mt-2 text-2xl text-white sm:text-4xl md:text-5xl">
          {hero.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)] md:text-base md:leading-7">
          {hero.support} Undo a Done anytime today.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
          >
            Back to Today
          </Link>
          <Link
            href="/habits"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
          >
            Manage habits
          </Link>
        </div>
      </GlassCard>

      <GlassCard className="rounded-[1.75rem] p-4 md:p-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
              {statusLabel}
            </p>
            <h2 className="section-title mt-2 text-2xl text-white md:text-3xl">
              {weeklyBoss.name}
            </h2>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <p className="text-lg font-semibold tabular-nums text-cyan-100">
              {weeklyBoss.effectiveHp}/{weeklyBoss.maxHp} left
            </p>
            <p className="flex flex-wrap items-center justify-end gap-1.5 text-sm text-white">
              <CurrencyAmount kind="coins" value={BOSS_CLEAR_COINS} size={14} className="text-white" />
              <span aria-hidden className="text-[var(--color-text-muted)]">
                ·
              </span>
              <CurrencyAmount kind="exp" value={BOSS_CLEAR_EXP} size={14} className="text-white" />
            </p>
          </div>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-rose-400 to-amber-300 transition-all"
            style={{ width: `${Math.min(100, bossPercent)}%` }}
          />
        </div>

        {weeklyBoss.defeated ? (
          <button
            type="button"
            onClick={claimBossReward}
            disabled={weeklyBoss.rewardClaimed || claimPending}
            className="mt-6 rounded-full border border-amber-300/20 bg-amber-300/10 px-5 py-3 text-sm text-amber-100 transition hover:bg-amber-300/16 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {weeklyBoss.rewardClaimed
              ? "Reward claimed"
              : claimPending
                ? "Claiming…"
                : "Claim weekly reward"}
          </button>
        ) : (
          <p className="mt-6 text-sm text-[var(--color-text-muted)]">
            Finish habits to fill the bar.
          </p>
        )}

        {weeklyChallenge ? (
          <div id="clears" className="mt-8 scroll-mt-24 border-t border-white/10 pt-6">
            <ChallengeCard
              compact
              challenge={weeklyChallenge}
              locked={!weeklyUnlocked}
              lockLabel={
                weeklyUnlocked
                  ? null
                  : `Available from level ${weeklyRequiredLevel ?? 1}`
              }
              pending={pendingClaimIds.includes(`challenge:${weeklyChallenge.id}`)}
              titleAlreadyOwned={shopItems.some(
                (item) => item.id === weeklyChallenge.reward.titleItemId && item.owned,
              )}
              onClaim={claimChallengeReward}
            />
          </div>
        ) : null}
      </GlassCard>
    </div>
  );
}
