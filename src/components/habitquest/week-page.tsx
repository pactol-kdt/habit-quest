"use client";

import Link from "next/link";
import { ChallengeCard } from "~/components/habitquest/challenge-card";
import { GlassCard } from "~/components/habitquest/glass-card";
import { PAGE_HEROES } from "~/lib/habitquest/copy";
import { isFeatureUnlocked } from "~/lib/habitquest/utils";
import { useHabitQuestStore } from "~/store/habitquest-store";

export function WeekPage() {
  const {
    claimChallengeReward,
    pendingClaimIds,
    hydrated,
    challenges,
    shopItems,
    levelUnlocks,
  } = useHabitQuestStore((state) => state);
  const hero = PAGE_HEROES.week;

  const weeklyChallenge = challenges.find((challenge) => challenge.period === "weekly") ?? null;
  const weeklyUnlocked = isFeatureUnlocked(levelUnlocks, "weekly-challenges");
  const weeklyRequiredLevel = levelUnlocks.find(
    (unlock) => unlock.feature === "weekly-challenges",
  )?.requiredLevel;

  if (!hydrated) {
    return (
      <div className="grid gap-4 md:gap-6">
        <div className="glass-panel h-64 animate-pulse rounded-[2rem]" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:gap-6">
      <GlassCard className="overflow-hidden rounded-[1.75rem] p-4 md:rounded-[2rem] md:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
          {hero.eyebrow}
        </p>
        <h1 className="section-title mt-2 text-2xl text-white sm:text-4xl md:text-5xl">
          {hero.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)] md:text-base md:leading-7">
          {hero.support}
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

      {weeklyChallenge ? (
        <div id="clears" className="scroll-mt-24">
          <ChallengeCard
            challenge={weeklyChallenge}
            locked={!weeklyUnlocked}
            lockLabel={
              weeklyUnlocked ? null : `Available from level ${weeklyRequiredLevel ?? 1}`
            }
            claimHref="/"
            pending={pendingClaimIds.includes(`challenge:${weeklyChallenge.id}`)}
            titleAlreadyOwned={shopItems.some(
              (item) => item.id === weeklyChallenge.reward.titleItemId && item.owned,
            )}
            onClaim={claimChallengeReward}
          />
        </div>
      ) : null}
    </div>
  );
}
