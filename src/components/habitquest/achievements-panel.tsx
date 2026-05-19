import { GlassCard } from "~/components/habitquest/glass-card";
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
        {(recentAchievements.length ? recentAchievements : achievements).map((achievement) => (
          <div
            key={achievement.id}
            className={cn(
              "rounded-3xl border p-4 transition",
              achievement.unlocked
                ? "border-amber-300/18 bg-amber-300/8"
                : "border-white/10 bg-white/4",
            )}
          >
            <div className="flex items-start gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-sm font-semibold text-white">
                {achievement.icon}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-white">{achievement.title}</h3>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] uppercase tracking-[0.2em]",
                      achievement.unlocked
                        ? "bg-amber-300/14 text-amber-200"
                        : "bg-white/7 text-[var(--color-text-muted)]",
                    )}
                  >
                    {achievement.unlocked ? "Unlocked" : "Locked"}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-muted)]">{achievement.description}</p>
                <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  <span className="rounded-full bg-white/5 px-2.5 py-1">
                    +{achievement.reward.coins} coins
                  </span>
                  <span className="rounded-full bg-white/5 px-2.5 py-1">
                    +{achievement.reward.exp} EXP
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
        ))}
      </div>
    </GlassCard>
  );
}
