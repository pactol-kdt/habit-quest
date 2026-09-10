import { GlassCard } from "~/components/habitquest/glass-card";
import { CurrencyAmount } from "~/components/habitquest/icons/currency-amount";
import { LockSilhouette } from "~/components/habitquest/icons/lock-silhouette";
import { cn } from "~/lib/ui/cn";
import { formatDateLabel } from "~/lib/habitquest/utils";
import type { Achievement } from "~/types/habitquest";

interface AchievementGridProps {
  achievements: Achievement[];
}

export function AchievementGrid({ achievements }: AchievementGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {achievements.map((achievement) => {
        const locked = !achievement.unlocked;

        return (
          <GlassCard
            key={achievement.id}
            className={cn(
              "relative h-full overflow-hidden transition",
              achievement.unlocked
                ? "border-amber-300/18"
                : "border-white/8 opacity-[0.62] grayscale-[0.55]",
            )}
          >
            {locked ? (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,transparent_35%,rgba(7,17,31,0.45)_100%)]"
              />
            ) : null}
            <div
              className={cn(
                "relative mb-4 flex items-start gap-4",
                locked && "blur-[0.4px]",
              )}
            >
              <div
                className={cn(
                  "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-sm font-semibold",
                  achievement.unlocked
                    ? "border-white/10 bg-white/5 text-white"
                    : "border-white/8 bg-white/4 text-white/55",
                )}
              >
                <span className={cn(locked && "opacity-40")}>{achievement.icon}</span>
                {locked ? (
                  <span
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center rounded-2xl bg-[rgba(7,17,31,0.35)]"
                  >
                    <LockSilhouette size={18} />
                  </span>
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                  {achievement.category}
                </p>
                <h3
                  className={cn(
                    "mt-1 text-lg font-semibold",
                    locked ? "text-white/70" : "text-white",
                  )}
                >
                  {achievement.title}
                </h3>
              </div>
            </div>
            <p
              className={cn(
                "relative text-sm leading-6 text-[var(--color-text-muted)]",
                locked && "opacity-80",
              )}
            >
              {achievement.description}
            </p>
            <div className="relative mt-4 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 normal-case tracking-normal">
                <CurrencyAmount
                  kind="coins"
                  value={achievement.reward.coins}
                  prefix="+"
                  size={13}
                  className="text-[var(--color-text-muted)]"
                />
              </span>
              <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 normal-case tracking-normal">
                <CurrencyAmount
                  kind="exp"
                  value={achievement.reward.exp}
                  prefix="+"
                  size={13}
                  className="text-[var(--color-text-muted)]"
                />
              </span>
            </div>
            {achievement.unlockedAt ? (
              <p className="relative mt-4 text-xs uppercase tracking-[0.18em] text-amber-200/85">
                {formatDateLabel(achievement.unlockedAt.slice(0, 10))}
              </p>
            ) : null}
          </GlassCard>
        );
      })}
    </div>
  );
}
