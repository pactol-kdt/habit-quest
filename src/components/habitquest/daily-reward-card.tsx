import { GlassCard } from "~/components/habitquest/glass-card";
import { SETTLEMENT_LOCK_HINT } from "~/lib/habitquest/constants";

interface DailyRewardCardProps {
  loginClaimed: boolean;
  completionClaimed: boolean;
  completedCount: number;
  dueCount: number;
  qualifiesForReward: boolean;
  dailyLoginCoins: number;
  dailyCompletionCoins: number;
}

export function DailyRewardCard({
  loginClaimed,
  completionClaimed,
  completedCount,
  dueCount,
  qualifiesForReward,
  dailyLoginCoins,
  dailyCompletionCoins,
}: DailyRewardCardProps) {
  return (
    <GlassCard className="h-full">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
          Daily Rewards
        </p>
        <h2 className="section-title mt-2 text-2xl text-white">Daily coin blessings</h2>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Login gifts arrive on their own. Perfect-day coins wait in preview until tonight&apos;s
          lock-in.
        </p>
      </div>

      <div className="space-y-3">
        <div className="rounded-3xl border border-white/10 bg-white/4 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-white">Daily login</p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Auto-granted once when you open the app each local day. No claim button.
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-amber-100">+{dailyLoginCoins}</p>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                {loginClaimed ? "Paid today" : "Pays on open"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/4 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-white">Perfect day clear</p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Finish every habit due today (at least 3). {SETTLEMENT_LOCK_HINT}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-amber-100">+{dailyCompletionCoins}</p>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                {completionClaimed
                  ? "Banked"
                  : qualifiesForReward
                    ? "Preview"
                    : "Not yet"}
              </p>
            </div>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/6">
            <div
              className="hq-fill-accent h-full rounded-full"
              style={{
                width: dueCount ? `${Math.min((completedCount / dueCount) * 100, 100)}%` : "0%",
              }}
            />
          </div>
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">
            {qualifiesForReward && !completionClaimed
              ? `Qualified — +${dailyCompletionCoins} coins bank at lock-in.`
              : `${completedCount}/${dueCount || 0} due habits cleared today.`}
          </p>
        </div>
      </div>
    </GlassCard>
  );
}
