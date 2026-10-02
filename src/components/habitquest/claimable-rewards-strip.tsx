"use client";

import { GlassCard } from "~/components/habitquest/glass-card";
import { useClaimableRewards } from "~/hooks/use-claimable-rewards";
import { useHabitQuestStore } from "~/store/habitquest-store";
import type { ClaimableReward } from "~/lib/habitquest/claimables";

function claimAction(
  item: ClaimableReward,
  actions: {
    claimChallengeReward: (id: string) => void;
    claimQuestArcReward: (id: string) => void;
    claimSeasonPassLevel: (level: number) => void;
  },
) {
  if (item.kind === "challenge") {
    actions.claimChallengeReward(item.id.replace("challenge:", ""));
    return;
  }
  if (item.kind === "quest") {
    actions.claimQuestArcReward(item.id.replace("quest:", ""));
    return;
  }
  const level = Number(item.id.replace("season:", ""));
  if (Number.isFinite(level)) {
    actions.claimSeasonPassLevel(level);
  }
}

export function ClaimableRewardsStrip() {
  const claimables = useClaimableRewards();
  const claimChallengeReward = useHabitQuestStore((state) => state.claimChallengeReward);
  const claimQuestArcReward = useHabitQuestStore((state) => state.claimQuestArcReward);
  const claimSeasonPassLevel = useHabitQuestStore((state) => state.claimSeasonPassLevel);
  const claimAllRewards = useHabitQuestStore((state) => state.claimAllRewards);
  const pendingClaimIds = useHabitQuestStore((state) => state.pendingClaimIds);

  if (!claimables.length) {
    return null;
  }

  const claimingAll = pendingClaimIds.includes("claim-all");
  const anyPending =
    claimingAll || claimables.some((item) => pendingClaimIds.includes(item.id));

  return (
    <GlassCard className="rounded-2xl border-amber-300/20 bg-amber-300/8 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-amber-50">
          {claimables.length} reward{claimables.length === 1 ? "" : "s"} ready
        </p>
        {claimables.length > 1 ? (
          <button
            type="button"
            disabled={anyPending}
            onClick={() => claimAllRewards(["challenge", "quest", "season"])}
            className="min-h-11 rounded-full hq-btn-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {claimingAll ? "Claiming…" : "Claim all"}
          </button>
        ) : null}
      </div>

      <div className="mt-3 grid gap-2">
        {claimables.map((item) => {
          const pending = claimingAll || pendingClaimIds.includes(item.id);
          return (
            <div
              key={item.id}
              className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{item.detail}</p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  claimAction(item, {
                    claimChallengeReward,
                    claimQuestArcReward,
                    claimSeasonPassLevel,
                  })
                }
                className="min-h-11 shrink-0 rounded-full hq-btn-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? "Claiming…" : "Claim"}
              </button>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
