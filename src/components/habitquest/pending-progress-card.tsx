"use client";

import Link from "next/link";
import { GlassCard } from "~/components/habitquest/glass-card";
import { SETTLEMENT_LOCK_HINT } from "~/lib/habitquest/constants";
import { getComboRewards, getNextComboMilestone } from "~/lib/habitquest/combo";
import { formatNumber, getTodayDateKey } from "~/lib/habitquest/utils";
import { useEffectiveProgress } from "~/hooks/use-effective-progress";
import { useHabitQuestStore } from "~/store/habitquest-store";

export function PendingProgressCard() {
  const rewardSystems = useHabitQuestStore((state) => state.rewardSystems);
  const {
    pendingHabitExp,
    pendingSeasonXp,
    pendingCombo,
    pendingComeback,
    weeklyBoss,
  } = useEffectiveProgress();

  const today = getTodayDateKey();
  const todayCombo =
    rewardSystems.comboDate === today && rewardSystems.todayCombo > 0
      ? rewardSystems.todayCombo
      : 0;
  const comboPreview = getComboRewards(todayCombo);
  const nextMilestone = getNextComboMilestone(todayCombo);
  const pendingCoins = pendingComeback.coins + pendingCombo.coins;
  const pendingExp = pendingHabitExp + pendingCombo.exp + pendingComeback.exp;
  const hasPending =
    pendingExp > 0 ||
    pendingCoins > 0 ||
    pendingSeasonXp > 0 ||
    weeklyBoss.pendingDamage > 0 ||
    todayCombo > 0;

  return (
    <GlassCard className="rounded-[1.75rem]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
            Today&apos;s pending
          </p>
          <h2 className="section-title mt-2 text-2xl text-white">What will lock in</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--color-text-muted)]">
            {hasPending
              ? SETTLEMENT_LOCK_HINT
              : "Clear habits to bank pending EXP, coins, season XP, and boss damage."}{" "}
            <Link href="/guides" className="hq-text-accent underline-offset-2 hover:underline">
              Learn more
            </Link>
          </p>
        </div>
        {todayCombo > 0 ? (
          <div className="rounded-3xl border border-pink-300/20 bg-pink-300/8 px-4 py-3 text-sm text-pink-100">
            Combo x{todayCombo}
            {comboPreview.exp > 0 ? ` · +${comboPreview.exp} EXP` : ""}
            {comboPreview.coins > 0 ? ` · +${comboPreview.coins}c` : ""}
            {nextMilestone ? ` · next coin at ${nextMilestone}` : ""}
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/4 p-3 sm:rounded-3xl sm:p-4">
          <p className="text-xs text-[var(--color-text-muted)] sm:text-sm">Pending EXP</p>
          <p className="mt-1 text-xl font-semibold sm:text-2xl" style={{ color: "var(--color-cyan)" }}>
            {formatNumber(pendingExp)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/4 p-3 sm:rounded-3xl sm:p-4">
          <p className="text-xs text-[var(--color-text-muted)] sm:text-sm">Pending coins</p>
          <p className="mt-1 text-xl font-semibold sm:text-2xl" style={{ color: "var(--color-gold)" }}>
            {formatNumber(pendingCoins)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/4 p-3 sm:rounded-3xl sm:p-4">
          <p className="text-xs text-[var(--color-text-muted)] sm:text-sm">Season XP</p>
          <p className="mt-1 text-xl font-semibold sm:text-2xl" style={{ color: "var(--color-cyan)" }}>
            {formatNumber(pendingSeasonXp)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/4 p-3 sm:rounded-3xl sm:p-4">
          <p className="text-xs text-[var(--color-text-muted)] sm:text-sm">Boss damage</p>
          <p className="mt-1 text-xl font-semibold sm:text-2xl" style={{ color: "var(--color-pink)" }}>
            {weeklyBoss.pendingDamage}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Link
          href="/boss"
          className="flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
        >
          Boss
        </Link>
        <Link
          href="/season"
          className="flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
        >
          Season
        </Link>
      </div>
    </GlassCard>
  );
}
