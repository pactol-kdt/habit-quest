"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { GlassCard } from "~/components/habitquest/glass-card";
import { CurrencyAmount } from "~/components/habitquest/icons/currency-amount";
import { cn } from "~/lib/ui/cn";
import type { Challenge } from "~/types/habitquest";

interface ChallengeCardProps {
  challenge: Challenge;
  locked: boolean;
  lockLabel: string | null;
  pending?: boolean;
  /** When the exclusive title was earned on a prior period clear. */
  titleAlreadyOwned?: boolean;
  compact?: boolean;
  /** When set, a finished goal links here instead of claiming on this card. */
  claimHref?: string;
  claimHrefLabel?: string;
  onClaim: (challengeId: string) => void;
}

export function ChallengeCard({
  challenge,
  locked,
  lockLabel,
  pending = false,
  titleAlreadyOwned = false,
  compact = false,
  claimHref,
  claimHrefLabel = "Claim on Today",
  onClaim,
}: ChallengeCardProps) {
  const progressPercent = Math.min((challenge.progress / challenge.target) * 100, 100);
  const hasTitleReward = Boolean(challenge.reward.titleItemId);
  const showTitleChip = hasTitleReward && !titleAlreadyOwned;
  const repeatBonus = challenge.period === "monthly" ? 25 : 10;

  const body = (
    <>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
            {challenge.period === "weekly" ? "This week" : "This month"}
          </p>
          <h3 className={cn("mt-1 font-semibold text-white", compact ? "text-lg" : "section-title text-2xl")}>
            {compact ? challenge.description : challenge.title}
          </h3>
          {compact ? null : (
            <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
              {challenge.description}
            </p>
          )}
        </div>
        <div className="shrink-0 text-sm tabular-nums text-[var(--color-text-muted)]">
          {challenge.progress}/{challenge.target}
        </div>
      </div>

      <div className="space-y-3">
        <div className="h-2 overflow-hidden rounded-full bg-white/6">
          <motion.div
            className="h-full rounded-full hq-fill-accent"
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(progressPercent, 4)}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center text-[var(--color-text-muted)]">
            <CurrencyAmount kind="coins" value={challenge.reward.coins} prefix="+" size={13} />
          </span>
          <span aria-hidden className="text-[var(--color-text-muted)]">
            ·
          </span>
          <span className="inline-flex items-center text-[var(--color-text-muted)]">
            <CurrencyAmount kind="exp" value={challenge.reward.exp} prefix="+" size={13} />
          </span>
          {showTitleChip ? (
            <span className="text-amber-100">· Title</span>
          ) : null}
          {hasTitleReward && titleAlreadyOwned ? (
            <span className="inline-flex items-center gap-1 text-emerald-100">
              · Title owned · <CurrencyAmount kind="coins" value={repeatBonus} prefix="+" size={12} />
            </span>
          ) : null}
        </div>

        {locked ? (
          <p className="text-sm text-amber-100">{lockLabel}</p>
        ) : challenge.claimed ? (
          <p className="text-sm text-emerald-200">Claimed this period.</p>
        ) : challenge.completed ? (
          claimHref ? (
            <Link
              href={claimHref}
              className="inline-flex min-h-11 items-center rounded-full hq-btn-accent px-4 py-2 text-sm font-semibold text-slate-950"
            >
              {claimHrefLabel}
            </Link>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => onClaim(challenge.id)}
              className="rounded-full hq-btn-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Claiming…" : "Claim"}
            </button>
          )
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">
            Resets each {challenge.period === "weekly" ? "week" : "month"}.
          </p>
        )}
      </div>
    </>
  );

  if (compact) {
    return <div className={cn(locked && "opacity-70")}>{body}</div>;
  }

  return <GlassCard className={cn("h-full overflow-hidden", locked && "opacity-70")}>{body}</GlassCard>;
}
