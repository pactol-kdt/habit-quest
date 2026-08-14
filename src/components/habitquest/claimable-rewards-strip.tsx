"use client";

import Link from "next/link";
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
    claimBossReward: () => void;
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
  if (item.kind === "season") {
    const level = Number(item.id.replace("season:", ""));
    if (Number.isFinite(level)) {
      actions.claimSeasonPassLevel(level);
    }
    return;
  }
  actions.claimBossReward();
}

export function ClaimableRewardsStrip() {
  const claimables = useClaimableRewards();
  const claimChallengeReward = useHabitQuestStore((state) => state.claimChallengeReward);
  const claimQuestArcReward = useHabitQuestStore((state) => state.claimQuestArcReward);
  const claimSeasonPassLevel = useHabitQuestStore((state) => state.claimSeasonPassLevel);
  const claimBossReward = useHabitQuestStore((state) => state.claimBossReward);
  const pendingClaimIds = useHabitQuestStore((state) => state.pendingClaimIds);

  if (!claimables.length) {
    return null;
  }

  return (
    <GlassCard className="rounded-[1.75rem] border-amber-300/25 bg-amber-300/8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-amber-100/80">
            Gifts waiting
          </p>
          <h2 className="section-title mt-2 text-2xl text-white">
            {claimables.length} reward{claimables.length === 1 ? "" : "s"} waiting
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            These blessings are already banked — claim them when you are ready.
          </p>
        </div>
        <span className="self-start rounded-full border border-amber-300/30 bg-amber-300/15 px-3 py-1 text-xs uppercase tracking-[0.18em] text-amber-100">
          {claimables.length} ready
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {claimables.map((item) => {
          const pending = pendingClaimIds.includes(item.id);
          return (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">{item.detail}</p>
                <Link
                  href={item.href}
                  className="mt-1 inline-block text-xs hq-text-accent underline-offset-2 hover:underline"
                >
                  Open details
                </Link>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  claimAction(item, {
                    claimChallengeReward,
                    claimQuestArcReward,
                    claimSeasonPassLevel,
                    claimBossReward,
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
