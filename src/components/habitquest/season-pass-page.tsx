"use client";

import Link from "next/link";
import { ChallengeCard } from "~/components/habitquest/challenge-card";
import { GlassCard } from "~/components/habitquest/glass-card";
import { CurrencyAmount } from "~/components/habitquest/icons/currency-amount";
import { QuestChapterCard } from "~/components/habitquest/quest-chapter-card";
import { PAGE_HEROES } from "~/lib/habitquest/copy";
import { SEASON_PASS_XP_PER_LEVEL } from "~/lib/habitquest/constants";
import { cn } from "~/lib/ui/cn";
import { getActiveQuestArc } from "~/lib/habitquest/rewards";
import { formatNumber, isFeatureUnlocked } from "~/lib/habitquest/utils";
import { useEffectiveProgress } from "~/hooks/use-effective-progress";
import { useHabitQuestStore } from "~/store/habitquest-store";

export function SeasonPassPage() {
  const {
    seasonPass: settledSeasonPass,
    rewardSystems,
    levelUnlocks,
    challenges,
    shopItems,
    claimSeasonPassLevel,
    claimChallengeReward,
    claimQuestArcReward,
    claimAllRewards,
    pendingClaimIds,
    hydrated,
  } = useHabitQuestStore((state) => state);
  const { seasonPass, questArcs } = useEffectiveProgress();
  const hero = PAGE_HEROES.season;
  const monthlyChallenge = challenges.find((challenge) => challenge.period === "monthly") ?? null;
  const monthlyUnlocked = isFeatureUnlocked(levelUnlocks, "monthly-challenges");
  const monthlyRequiredLevel = levelUnlocks.find(
    (unlock) => unlock.feature === "monthly-challenges",
  )?.requiredLevel;
  const questUnlocked = isFeatureUnlocked(levelUnlocks, "quest-arcs");
  const questRequiredLevel = levelUnlocks.find((unlock) => unlock.feature === "quest-arcs")?.requiredLevel;
  const activeArc = getActiveQuestArc(questArcs);
  const questLockLabel = `Unlocks at level ${questRequiredLevel ?? 3}`;
  const monthlyLockLabel = `Available from level ${monthlyRequiredLevel ?? 1}`;

  const seasonUnlocked = isFeatureUnlocked(levelUnlocks, "season-pass");
  const seasonXpIntoLevel = seasonPass.xp % SEASON_PASS_XP_PER_LEVEL;
  const seasonProgressPercent = (seasonXpIntoLevel / SEASON_PASS_XP_PER_LEVEL) * 100;
  const claimableSeason = settledSeasonPass.rewards.filter(
    (reward) =>
      settledSeasonPass.level >= reward.level &&
      !settledSeasonPass.claimedLevels.includes(reward.level),
  );
  const claimingAllSeason =
    pendingClaimIds.includes("claim-all") ||
    claimableSeason.some((reward) => pendingClaimIds.includes(`season:${reward.level}`));

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
        <div className="grid gap-8 xl:grid-cols-[1.35fr_0.85fr]">
          <div>
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
                Walk today&apos;s list
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
                ? `Level ${seasonPass.level} · ${formatNumber(seasonPass.xp)} season XP`
                : "Available from level 1"}
            </p>
            {seasonUnlocked ? (
              <p className="mt-3 text-sm text-cyan-100/90">
                Seasons finished: {rewardSystems.seasonPassCompletions}
              </p>
            ) : null}
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-6">
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
                  : "Available from level 1"}
              </p>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="hq-fill-accent h-full rounded-full transition-all"
                style={{ width: `${seasonUnlocked ? seasonProgressPercent : 0}%` }}
              />
            </div>

            {seasonUnlocked && claimableSeason.length ? (
              <div className="mt-5 space-y-3">
                {claimableSeason.length > 1 ? (
                  <button
                    type="button"
                    disabled={claimingAllSeason}
                    onClick={() => claimAllRewards(["season"])}
                    className="min-h-11 rounded-full hq-btn-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {claimingAllSeason
                      ? "Claiming all…"
                      : `Claim all ${claimableSeason.length} tiers`}
                  </button>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {claimableSeason.map((reward) => {
                    const pending =
                      claimingAllSeason || pendingClaimIds.includes(`season:${reward.level}`);
                    return (
                      <button
                        key={reward.level}
                        type="button"
                        disabled={pending}
                        onClick={() => claimSeasonPassLevel(reward.level)}
                        className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-300/16 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {pending ? "Claiming…" : `Claim Lv ${reward.level} · ${reward.label}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm text-[var(--color-text-muted)]">
                {seasonUnlocked
                  ? "No claimable tiers right now — keep finishing habits."
                  : "Season is available from level 1."}
              </p>
            )}
          </GlassCard>

          {monthlyChallenge ? (
            <GlassCard id="month" className="scroll-mt-24 rounded-[1.75rem]">
              <ChallengeCard
                compact
                challenge={monthlyChallenge}
                locked={!monthlyUnlocked}
                lockLabel={monthlyUnlocked ? null : monthlyLockLabel}
                pending={pendingClaimIds.includes(`challenge:${monthlyChallenge.id}`)}
                titleAlreadyOwned={shopItems.some(
                  (item) => item.id === monthlyChallenge.reward.titleItemId && item.owned,
                )}
                onClaim={claimChallengeReward}
              />
            </GlassCard>
          ) : null}

          <GlassCard id="chapter" className="scroll-mt-24 rounded-[1.75rem]">
            <QuestChapterCard
              arc={activeArc}
              unlocked={questUnlocked}
              lockLabel={questLockLabel}
              pending={Boolean(activeArc && pendingClaimIds.includes(`quest:${activeArc.id}`))}
              onClaim={claimQuestArcReward}
            />
          </GlassCard>
        </div>

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
              const pending =
                claimingAllSeason || pendingClaimIds.includes(`season:${reward.level}`);
              const ready = settledReached && !claimed;

              return (
                <div
                  key={reward.level}
                  className={cn(
                    "rounded-3xl border px-4 py-3",
                    claimed
                      ? "border-emerald-300/20 bg-emerald-300/8"
                      : ready
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
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--color-text-muted)]">
                        <CurrencyAmount kind="coins" value={reward.coins} prefix="+" size={13} />
                        <span aria-hidden>·</span>
                        <CurrencyAmount kind="exp" value={reward.exp} prefix="+" size={13} />
                      </p>
                    </div>
                    {ready ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => claimSeasonPassLevel(reward.level)}
                        className="min-h-10 shrink-0 rounded-full border border-cyan-300/25 bg-cyan-300/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {pending ? "Claiming…" : "Claim"}
                      </button>
                    ) : (
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                        {claimed ? "Claimed" : "Locked"}
                      </p>
                    )}
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
