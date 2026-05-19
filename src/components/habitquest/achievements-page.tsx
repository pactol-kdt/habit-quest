"use client";

import { AchievementGrid } from "~/components/habitquest/achievement-grid";
import { GlassCard } from "~/components/habitquest/glass-card";
import { useHabitQuestStore } from "~/store/habitquest-store";

export function AchievementsPage() {
  const achievements = useHabitQuestStore((state) => state.achievements);
  const unlocked = achievements.filter((achievement) => achievement.unlocked).length;

  return (
    <div className="grid gap-6 pt-6">
      <GlassCard className="rounded-[2rem] p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
              Achievements
            </p>
            <h1 className="section-title mt-2 text-4xl text-white md:text-5xl">
              Trophy ledger
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--color-text-muted)]">
              Auto-unlocked milestones reward both coins and EXP. Every unlock is stored locally with the rest of your profile.
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white">
            {unlocked}/{achievements.length} unlocked
          </div>
        </div>
      </GlassCard>

      <AchievementGrid achievements={achievements} />
    </div>
  );
}
