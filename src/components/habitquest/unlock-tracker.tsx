import { GlassCard } from "~/components/habitquest/glass-card";
import { getNextLevelUnlock } from "~/lib/habitquest/utils";
import type { LevelUnlock } from "~/types/habitquest";

interface UnlockTrackerProps {
  level: number;
  levelUnlocks: LevelUnlock[];
}

export function UnlockTracker({ level, levelUnlocks }: UnlockTrackerProps) {
  const nextUnlock = getNextLevelUnlock(levelUnlocks, level);

  return (
    <GlassCard>
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
          Level Unlocks
        </p>
        <h2 className="section-title mt-2 text-2xl text-white">Progress to next unlock</h2>
      </div>

      {nextUnlock ? (
        <div className="rounded-3xl border border-white/10 bg-white/4 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-white">{nextUnlock.label}</p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {nextUnlock.description}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
              Lv {nextUnlock.requiredLevel}
            </div>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/6">
            <div
              className="hq-fill-accent h-full rounded-full"
              style={{
                width: `${Math.min((level / nextUnlock.requiredLevel) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/8 p-5">
          <p className="font-semibold text-emerald-100">All level unlocks cleared.</p>
          <p className="mt-1 text-sm text-emerald-100/80">
            You have access to every unlock tier in the current build.
          </p>
        </div>
      )}
    </GlassCard>
  );
}
