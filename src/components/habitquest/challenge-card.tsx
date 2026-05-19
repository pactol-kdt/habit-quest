"use client";

import { motion } from "framer-motion";
import { GlassCard } from "~/components/habitquest/glass-card";
import { cn } from "~/lib/ui/cn";
import type { Challenge } from "~/types/habitquest";

interface ChallengeCardProps {
  challenge: Challenge;
  locked: boolean;
  lockLabel: string | null;
  onClaim: (challengeId: string) => void;
}

export function ChallengeCard({
  challenge,
  locked,
  lockLabel,
  onClaim,
}: ChallengeCardProps) {
  const progressPercent = Math.min((challenge.progress / challenge.target) * 100, 100);

  return (
    <GlassCard className={cn("h-full", locked && "opacity-70")}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
            {challenge.period}
          </p>
          <h3 className="section-title mt-2 text-2xl text-white">{challenge.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
            {challenge.description}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-text-muted)]">
          {challenge.progress}/{challenge.target}
        </div>
      </div>

      <div className="space-y-4">
        <div className="h-3 overflow-hidden rounded-full bg-white/6">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-pink-400 via-cyan-300 to-amber-300"
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(progressPercent, 4)}%` }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
          <span className="rounded-full bg-white/5 px-3 py-1">+{challenge.reward.coins} coins</span>
          <span className="rounded-full bg-white/5 px-3 py-1">+{challenge.reward.exp} EXP</span>
          {challenge.reward.titleItemId ? (
            <span className="rounded-full bg-amber-300/10 px-3 py-1 text-amber-200">
              Exclusive title
            </span>
          ) : null}
        </div>
        {locked ? (
          <p className="text-sm text-amber-100">{lockLabel}</p>
        ) : challenge.claimed ? (
          <p className="text-sm text-emerald-200">Reward claimed.</p>
        ) : challenge.completed ? (
          <button
            type="button"
            onClick={() => onClaim(challenge.id)}
            className="rounded-full bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
          >
            Claim reward
          </button>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">
            Keep pushing. Rewards unlock when the bar is full.
          </p>
        )}
      </div>
    </GlassCard>
  );
}
