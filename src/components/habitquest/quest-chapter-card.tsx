"use client";

import { CurrencyAmount } from "~/components/habitquest/icons/currency-amount";
import { cn } from "~/lib/ui/cn";
import type { QuestArc } from "~/types/habitquest";

interface QuestChapterCardProps {
  arc: QuestArc | null;
  unlocked: boolean;
  lockLabel: string | null;
  pending?: boolean;
  onClaim: (arcId: string) => void;
}

export function QuestChapterCard({
  arc,
  unlocked,
  lockLabel,
  pending = false,
  onClaim,
}: QuestChapterCardProps) {
  const allClaimed = Boolean(unlocked && arc?.claimed);
  const progressPercent =
    arc && arc.target > 0 ? Math.min(100, (arc.progress / arc.target) * 100) : 0;

  return (
    <div className={cn(!unlocked && "opacity-70")}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
            Chapter
          </p>
          <h3 className="mt-1 text-lg font-semibold text-white">
            {!unlocked
              ? "Quest chapters"
              : allClaimed
                ? "All chapters claimed"
                : arc?.title ?? "Quest chapters"}
          </h3>
          <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
            {!unlocked
              ? lockLabel
              : allClaimed
                ? "The arc is complete for this run."
                : arc?.description}
          </p>
        </div>
        {unlocked && arc && !allClaimed ? (
          <div className="shrink-0 text-sm tabular-nums text-[var(--color-text-muted)]">
            {Math.min(arc.progress, arc.target)}/{arc.target}
          </div>
        ) : null}
      </div>

      {unlocked && arc && !allClaimed ? (
        <div className="space-y-3">
          <div className="h-2 overflow-hidden rounded-full bg-white/6">
            <div
              className="hq-fill-accent h-full rounded-full transition-all"
              style={{ width: `${Math.max(progressPercent, 4)}%` }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <CurrencyAmount kind="coins" value={arc.reward.coins} prefix="+" size={13} />
            <span aria-hidden>·</span>
            <CurrencyAmount kind="exp" value={arc.reward.exp} prefix="+" size={13} />
            {arc.reward.unlockThemeId ? <span className="text-amber-100">· Theme</span> : null}
          </div>
          {arc.completed && !arc.claimed ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => onClaim(arc.id)}
              className="rounded-full hq-btn-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Claiming…" : "Claim"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
