"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect } from "react";
import { formatNumber } from "~/lib/habitquest/utils";
import { useHabitQuestStore } from "~/store/habitquest-store";
import type { SettlementRecap } from "~/types/habitquest";

function RecapStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/4 px-3 py-3">
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function buildLines(recap: SettlementRecap) {
  const lines: string[] = [];
  if (recap.habitExp > 0) {
    lines.push(`${formatNumber(recap.habitExp)} habit EXP from ${recap.clears} clears`);
  }
  if (recap.comboExp > 0 || recap.comboCoins > 0) {
    lines.push(
      `Combo payout +${recap.comboExp} EXP` +
        (recap.comboCoins ? ` · +${recap.comboCoins} coins` : ""),
    );
  }
  if (recap.comebackExp > 0 || recap.comebackCoins > 0) {
    lines.push(`Comeback +${recap.comebackExp} EXP · +${recap.comebackCoins} coins`);
  }
  if (recap.perfectDayCoins > 0) {
    lines.push(`Perfect day +${recap.perfectDayCoins} coins`);
  }
  if (recap.bossDamage > 0) {
    lines.push(`${recap.bossDamage} boss damage applied`);
  }
  return lines;
}

export function SettlementRecapModal() {
  const settlementRecap = useHabitQuestStore((state) => state.settlementRecap);
  const dismissSettlementRecap = useHabitQuestStore((state) => state.dismissSettlementRecap);

  useEffect(() => {
    if (!settlementRecap) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        dismissSettlementRecap();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [dismissSettlementRecap, settlementRecap]);

  return (
    <AnimatePresence>
      {settlementRecap ? (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-md sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismissSettlementRecap}
        >
          <motion.div
            className="glass-panel max-h-[min(92dvh,900px)] w-full max-w-lg overflow-y-auto rounded-t-[1.5rem] border border-white/10 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:rounded-[2rem] md:p-8"
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">Lock-in</p>
            <h2 className="section-title mt-3 text-2xl text-white sm:text-3xl">Yesterday locked in</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
              Progress through {settlementRecap.throughDate} is now permanent. Claims for boss,
              season, and quests use this settled state.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <RecapStat label="Streak" value={`${settlementRecap.streak}d`} />
              <RecapStat label="Clears settled" value={String(settlementRecap.clears)} />
              <RecapStat
                label="EXP locked"
                value={formatNumber(
                  settlementRecap.habitExp +
                    settlementRecap.comboExp +
                    settlementRecap.comebackExp,
                )}
              />
              <RecapStat
                label="Coins locked"
                value={formatNumber(
                  settlementRecap.comboCoins +
                    settlementRecap.comebackCoins +
                    settlementRecap.perfectDayCoins,
                )}
              />
            </div>

            <ul className="mt-5 space-y-2">
              {buildLines(settlementRecap).map((line) => (
                <li
                  key={line}
                  className="rounded-2xl border border-white/10 bg-white/4 px-3.5 py-2.5 text-sm text-[var(--color-text-muted)]"
                >
                  {line}
                </li>
              ))}
              {!buildLines(settlementRecap).length ? (
                <li className="rounded-2xl border border-white/10 bg-white/4 px-3.5 py-2.5 text-sm text-[var(--color-text-muted)]">
                  Days caught up with no extra payouts — streak and quests are current.
                </li>
              ) : null}
            </ul>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={dismissSettlementRecap}
                className="rounded-full hq-btn-accent px-5 py-3 text-sm font-semibold text-slate-950"
              >
                Continue
              </button>
              <Link
                href="/boss"
                onClick={dismissSettlementRecap}
                className="rounded-full border border-white/10 px-5 py-3 text-sm text-[var(--color-text-muted)] hover:text-white"
              >
                Check boss
              </Link>
              <Link
                href="/season"
                onClick={dismissSettlementRecap}
                className="rounded-full border border-white/10 px-5 py-3 text-sm text-[var(--color-text-muted)] hover:text-white"
              >
                Season pass
              </Link>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
