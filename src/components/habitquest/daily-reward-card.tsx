import { GlassCard } from "~/components/habitquest/glass-card";

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
        <h2 className="section-title mt-2 text-2xl text-white">Coin routine</h2>
      </div>

      <div className="space-y-3">
        <div className="rounded-3xl border border-white/10 bg-white/4 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-white">Daily login</p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Visit the app once per local day.
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-amber-100">+{dailyLoginCoins}</p>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                {loginClaimed ? "Claimed" : "Ready"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/4 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-white">Perfect day clear</p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Finish all habits due today and clear at least 3 of them.
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-amber-100">+{dailyCompletionCoins}</p>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                {completionClaimed
                  ? "Locked in"
                  : qualifiesForReward
                    ? "Pending lock-in"
                    : "Locked"}
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
            {completedCount}/{dueCount || 0} due habits completed today.
          </p>
        </div>
      </div>
    </GlassCard>
  );
}
