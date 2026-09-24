"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";
import { useDialogA11y } from "~/hooks/use-dialog-a11y";
import { formatDateLabel, formatNumber } from "~/lib/habitquest/utils";
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
    lines.push(
      `${formatNumber(recap.habitExp)} level progress from ${recap.clears} habit${recap.clears === 1 ? "" : "s"}`,
    );
  }
  if (recap.comboExp > 0 || recap.comboCoins > 0) {
    const parts = [
      recap.comboExp > 0 ? `+${formatNumber(recap.comboExp)} level progress` : null,
      recap.comboCoins > 0 ? `+${formatNumber(recap.comboCoins)} coins` : null,
    ].filter(Boolean);
    lines.push(`Extra for finishing several in a day: ${parts.join(" · ")}`);
  }
  if (recap.comebackExp > 0 || recap.comebackCoins > 0) {
    lines.push(
      `Welcome back +${formatNumber(recap.comebackExp)} level progress · +${formatNumber(recap.comebackCoins)} coins`,
    );
  }
  if (recap.perfectDayCoins > 0) {
    lines.push(`All habits done +${formatNumber(recap.perfectDayCoins)} coins`);
  }
  return lines;
}

export function SettlementRecapModal() {
  const settlementRecap = useHabitQuestStore((state) => state.settlementRecap);
  const dismissSettlementRecap = useHabitQuestStore((state) => state.dismissSettlementRecap);

  return (
    <AnimatePresence>
      {settlementRecap ? (
        <SettlementRecapDialog recap={settlementRecap} onClose={dismissSettlementRecap} />
      ) : null}
    </AnimatePresence>
  );
}

function SettlementRecapDialog({
  recap,
  onClose,
}: {
  recap: SettlementRecap;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogA11y(panelRef, onClose);

  return (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-md sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settlement-recap-title"
            tabIndex={-1}
            className="glass-panel max-h-[min(92dvh,900px)] w-full max-w-lg overflow-y-auto rounded-t-[1.5rem] border border-white/10 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] outline-none md:rounded-[2rem] md:p-8"
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">Caught up</p>
            <h2 id="settlement-recap-title" className="section-title mt-3 text-2xl text-white sm:text-3xl">
              Missed days are counted
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
              Habits through {formatDateLabel(recap.throughDate)} are in your balance now.
              A Done still pays when you tap it, and you can undo it the same day.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <RecapStat label="Streak" value={`${recap.streak}d`} />
              <RecapStat label="Habits finished" value={String(recap.clears)} />
              <RecapStat
                label="Level progress"
                value={formatNumber(
                  recap.habitExp + recap.comboExp + recap.comebackExp,
                )}
              />
              <RecapStat
                label="Coins added"
                value={formatNumber(
                  recap.comboCoins + recap.comebackCoins + recap.perfectDayCoins,
                )}
              />
            </div>

            <ul className="mt-5 space-y-2">
              {buildLines(recap).map((line) => (
                <li
                  key={line}
                  className="rounded-2xl border border-white/10 bg-white/4 px-3.5 py-2.5 text-sm text-[var(--color-text-muted)]"
                >
                  {line}
                </li>
              ))}
              {!buildLines(recap).length ? (
                <li className="rounded-2xl border border-white/10 bg-white/4 px-3.5 py-2.5 text-sm text-[var(--color-text-muted)]">
                  Those days had no extra rewards. Your streak is up to date.
                </li>
              ) : null}
            </ul>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full hq-btn-accent px-5 py-3 text-sm font-semibold text-slate-950"
              >
                Continue
              </button>
              <Link
                href="/week"
                onClick={onClose}
                className="rounded-full border border-white/10 px-5 py-3 text-sm text-[var(--color-text-muted)] hover:text-white"
              >
                Week
              </Link>
              <Link
                href="/season"
                onClick={onClose}
                className="rounded-full border border-white/10 px-5 py-3 text-sm text-[var(--color-text-muted)] hover:text-white"
              >
                Season
              </Link>
            </div>
          </motion.div>
        </motion.div>
  );
}
