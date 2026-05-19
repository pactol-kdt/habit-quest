import { GlassCard } from "~/components/habitquest/glass-card";
import { cn } from "~/lib/ui/cn";
import { formatDateLabel } from "~/lib/habitquest/utils";
import type { Achievement } from "~/types/habitquest";

interface AchievementGridProps {
  achievements: Achievement[];
}

export function AchievementGrid({ achievements }: AchievementGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {achievements.map((achievement) => (
        <GlassCard
          key={achievement.id}
          className={cn(
            "h-full",
            achievement.unlocked ? "border-amber-300/18" : "opacity-80",
          )}
        >
          <div className="mb-4 flex items-start gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white">
              {achievement.icon}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                {achievement.category}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-white">{achievement.title}</h3>
            </div>
          </div>
          <p className="text-sm leading-6 text-[var(--color-text-muted)]">{achievement.description}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            <span className="rounded-full bg-white/5 px-3 py-1">+{achievement.reward.coins} coins</span>
            <span className="rounded-full bg-white/5 px-3 py-1">+{achievement.reward.exp} EXP</span>
            <span
              className={cn(
                "rounded-full px-3 py-1",
                achievement.unlocked
                  ? "bg-emerald-300/10 text-emerald-100"
                  : "bg-white/5 text-[var(--color-text-muted)]",
              )}
            >
              {achievement.unlocked ? "Unlocked" : "Locked"}
            </span>
          </div>
          {achievement.unlockedAt ? (
            <p className="mt-4 text-xs uppercase tracking-[0.18em] text-amber-200/85">
              {formatDateLabel(achievement.unlockedAt.slice(0, 10))}
            </p>
          ) : null}
        </GlassCard>
      ))}
    </div>
  );
}
