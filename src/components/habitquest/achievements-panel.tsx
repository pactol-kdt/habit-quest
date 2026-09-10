import { GlassCard } from "~/components/habitquest/glass-card";
import { CurrencyAmount } from "~/components/habitquest/icons/currency-amount";
import { LockSilhouette } from "~/components/habitquest/icons/lock-silhouette";
import { formatDateLabel } from "~/lib/habitquest/utils";
import { cn } from "~/lib/ui/cn";
import type { Achievement } from "~/types/habitquest";

interface AchievementsPanelProps {
  achievements: Achievement[];
}

export function AchievementsPanel({ achievements }: AchievementsPanelProps) {
  const recentAchievements = achievements
    .filter((achievement) => achievement.unlocked)
    .sort((left, right) => {
      return new Date(right.unlockedAt ?? 0).getTime() - new Date(left.unlockedAt ?? 0).getTime();
    })
    .slice(0, 4);

  return (
    <GlassCard className="h-full">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
            Achievements
          </p>
          <h2 className="section-title mt-2 text-2xl text-white">Recent unlocks</h2>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-[var(--color-text-muted)]">
          {achievements.filter((achievement) => achievement.unlocked).length}/{achievements.length}
        </div>
      </div>

      <div className="space-y-3">
        {(recentAchievements.length ? recentAchievements : achievements).map((achievement) => {
          const locked = !achievement.unlocked;

          return (
            <div
              key={achievement.id}
              className={cn(
                "relative overflow-hidden rounded-3xl border p-4 transition",
                achievement.unlocked
                  ? "border-amber-300/18 bg-amber-300/8"
                  : "border-white/8 bg-white/3 opacity-[0.62] grayscale-[0.55]",
              )}
            >
              <div className={cn("flex items-start gap-4", locked && "blur-[0.35px]")}>
                <div
                  className={cn(
                    "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-sm font-semibold",
                    achievement.unlocked
                      ? "border-white/10 bg-white/6 text-white"
                      : "border-white/8 bg-white/4 text-white/50",
                  )}
                >
                  <span className={cn(locked && "opacity-40")}>{achievement.icon}</span>
                  {locked ? (
                    <span
                      aria-hidden
                      className="absolute inset-0 flex items-center justify-center rounded-2xl bg-[rgba(7,17,31,0.35)]"
                    >
                      <LockSilhouette size={16} />
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      className={cn(
                        "font-semibold",
                        locked ? "text-white/70" : "text-white",
                      )}
                    >
                      {achievement.title}
                    </h3>
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)]">{achievement.description}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-[var(--color-text-muted)]">
                    <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-1">
                      <CurrencyAmount
                        kind="coins"
                        value={achievement.reward.coins}
                        prefix="+"
                        size={12}
                      />
                    </span>
                    <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-1">
                      <CurrencyAmount
                        kind="exp"
                        value={achievement.reward.exp}
                        prefix="+"
                        size={12}
                      />
                    </span>
                  </div>
                  {achievement.unlockedAt ? (
                    <p className="text-xs uppercase tracking-[0.2em] text-amber-200/85">
                      {formatDateLabel(achievement.unlockedAt.slice(0, 10))}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
