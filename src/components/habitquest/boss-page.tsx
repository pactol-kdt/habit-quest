"use client";

import Link from "next/link";
import { GlassCard } from "~/components/habitquest/glass-card";
import { BOSS_CLEAR_COINS, BOSS_CLEAR_EXP, BOSS_DAMAGE, SETTLEMENT_LOCK_HINT } from "~/lib/habitquest/constants";
import { useEffectiveProgress } from "~/hooks/use-effective-progress";
import { useHabitQuestStore } from "~/store/habitquest-store";

export function BossPage() {
  const { claimBossReward, hydrated } = useHabitQuestStore((state) => state);
  const { weeklyBoss } = useEffectiveProgress();

  const bossPercent = weeklyBoss.maxHp
    ? ((weeklyBoss.maxHp - weeklyBoss.effectiveHp) / weeklyBoss.maxHp) * 100
    : 0;
  const damageDealt = Math.max(0, weeklyBoss.maxHp - weeklyBoss.effectiveHp);
  const wouldDefeatToday = !weeklyBoss.defeated && weeklyBoss.effectiveHp <= 0;

  if (!hydrated) {
    return (
      <div className="grid gap-4 pt-4 md:gap-6 md:pt-6">
        <div className="glass-panel h-64 animate-pulse rounded-[2rem]" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 pt-4 md:gap-6 md:pt-6">
      <GlassCard className="overflow-hidden rounded-[1.75rem] p-4 md:rounded-[2rem] md:p-8">
        <div className="grid gap-8 xl:grid-cols-[1.35fr_0.85fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
              Weekly raid
            </p>
            <h1 className="section-title mt-2 text-2xl text-white sm:text-4xl md:text-5xl">
              Boss fight
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)] md:text-base md:leading-7">
              Habit clears deal damage. Today&apos;s hits stay pending with all other progress so
              undos stay safe — {SETTLEMENT_LOCK_HINT}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
              >
                Clear habits
              </Link>
              <Link
                href="/habits"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
              >
                Manage habits
              </Link>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-rose-300/20 bg-gradient-to-br from-rose-400/10 via-amber-300/5 to-transparent p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-rose-100/80">This week</p>
            <h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">{weeklyBoss.name}</h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              Week key {weeklyBoss.weekKey}
            </p>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <GlassCard className="rounded-[1.75rem]">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
                Encounter
              </p>
              <h2 className="section-title mt-2 text-2xl text-white">{weeklyBoss.name}</h2>
            </div>
            <p className="text-lg font-semibold text-cyan-100">
              {weeklyBoss.effectiveHp}/{weeklyBoss.maxHp} HP
            </p>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-400 to-amber-300 transition-all"
              style={{ width: `${Math.min(100, bossPercent)}%` }}
            />
          </div>

          {weeklyBoss.pendingDamage > 0 ? (
            <p className="mt-3 text-sm text-amber-100/90">
              Pending today: {weeklyBoss.pendingDamage} dmg ({SETTLEMENT_LOCK_HINT})
              {wouldDefeatToday ? " — Pending KO if it sticks." : ""}
            </p>
          ) : (
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">
              No pending damage today. Undoing a clear before midnight reverses its hit.
            </p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/4 p-4">
              <p className="text-sm text-[var(--color-text-muted)]">Damage dealt</p>
              <p className="mt-1 text-2xl font-semibold text-white">{damageDealt}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/4 p-4">
              <p className="text-sm text-[var(--color-text-muted)]">Status</p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {weeklyBoss.defeated ? "Defeated" : wouldDefeatToday ? "Pending KO" : "Alive"}
              </p>
            </div>
            <div className="col-span-2 rounded-3xl border border-white/10 bg-white/4 p-4 sm:col-span-1">
              <p className="text-sm text-[var(--color-text-muted)]">Clear bounty</p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {BOSS_CLEAR_COINS}c · {BOSS_CLEAR_EXP} XP
              </p>
            </div>
          </div>

          {weeklyBoss.defeated ? (
            <button
              type="button"
              onClick={claimBossReward}
              disabled={weeklyBoss.rewardClaimed}
              className="mt-6 rounded-full border border-amber-300/20 bg-amber-300/10 px-5 py-3 text-sm text-amber-100 transition hover:bg-amber-300/16 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {weeklyBoss.rewardClaimed ? "Reward claimed" : "Claim boss reward"}
            </button>
          ) : (
            <p className="mt-6 text-sm text-[var(--color-text-muted)]">
              {wouldDefeatToday
                ? `Today's clears would finish the boss. Claim unlocks after lock-in. ${SETTLEMENT_LOCK_HINT}`
                : "Complete habits on the dashboard to chip away at the boss HP bar."}
            </p>
          )}
        </GlassCard>

        <GlassCard className="rounded-[1.75rem]">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
            Damage chart
          </p>
          <h2 className="section-title mt-2 text-2xl text-white">Hit values</h2>
          <div className="mt-5 space-y-3">
            {(
              [
                ["Easy", BOSS_DAMAGE.easy],
                ["Medium", BOSS_DAMAGE.medium],
                ["Hard", BOSS_DAMAGE.hard],
              ] as const
            ).map(([label, damage]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/4 px-4 py-3"
              >
                <span className="text-sm text-[var(--color-text-muted)]">{label} habit</span>
                <span className="font-semibold text-white">{damage} dmg</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
