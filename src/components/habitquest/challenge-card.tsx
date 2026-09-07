"use client";

import { motion } from "framer-motion";
import { GlassCard } from "~/components/habitquest/glass-card";
import { cn } from "~/lib/ui/cn";
import type { Challenge } from "~/types/habitquest";

interface ChallengeCardProps {
  challenge: Challenge;
  locked: boolean;
  lockLabel: string | null;
  pending?: boolean;
  /** When the exclusive title was earned on a prior period clear. */
  titleAlreadyOwned?: boolean;
  onClaim: (challengeId: string) => void;
}

export function ChallengeCard({
  challenge,
  locked,
  lockLabel,
  pending = false,
  titleAlreadyOwned = false,
  onClaim,
}: ChallengeCardProps) {
  const progressPercent = Math.min((challenge.progress / challenge.target) * 100, 100);
  const hasTitleReward = Boolean(challenge.reward.titleItemId);
  const showTitleChip = hasTitleReward && !titleAlreadyOwned;
  const repeatBonus = challenge.period === "monthly" ? 25 : 10;

  return (
    <GlassCard className={cn("h-full overflow-hidden", locked && "opacity-70")}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
            {challenge.period} contract
          </p>
          <h3 className="section-title mt-2 text-2xl text-white">{challenge.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
            {challenge.description}
          </p>
        </div>
        <div className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm tabular-nums text-[var(--color-text-muted)]">
          {challenge.progress}/{challenge.target}
        </div>
      </div>

      <div className="space-y-4">
        <div className="h-2.5 overflow-hidden rounded-full bg-white/6">
          <motion.div
            className="h-full rounded-full hq-fill-accent"
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(progressPercent, 4)}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[var(--color-text-muted)]">
            +{challenge.reward.coins} coins
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[var(--color-text-muted)]">
            +{challenge.reward.exp} EXP
          </span>
          {showTitleChip ? (
            <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-amber-100">
              Exclusive title
            </span>
          ) : null}
          {hasTitleReward && titleAlreadyOwned ? (
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-emerald-100">
              Title owned · +{repeatBonus} bonus coins
            </span>
          ) : null}
        </div>

        {locked ? (
          <p className="text-sm text-amber-100">{lockLabel}</p>
        ) : challenge.claimed ? (
          <p className="text-sm text-emerald-200">Reward claimed for this period.</p>
        ) : challenge.completed ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => onClaim(challenge.id)}
            className="rounded-full hq-btn-accent px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Claiming…" : "Claim reward"}
          </button>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">
            Fill the bar to claim — progress resets each {challenge.period === "weekly" ? "week" : "month"}.
          </p>
        )}
      </div>
    </GlassCard>
  );
}
