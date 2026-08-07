"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useHabitQuestStore } from "~/store/habitquest-store";
import type { CelebrationKind } from "~/types/habitquest";

const KIND_ACCENT: Record<CelebrationKind, string> = {
  "streak-milestone": "from-emerald-400/30 via-cyan-300/20 to-transparent",
  "boss-clear": "from-rose-400/30 via-amber-300/20 to-transparent",
  "quest-chapter": "from-pink-400/30 via-violet-300/20 to-transparent",
  comeback: "from-sky-400/30 via-cyan-300/20 to-transparent",
  crit: "from-amber-300/35 via-orange-400/20 to-transparent",
  "season-level": "from-cyan-300/30 via-sky-400/20 to-transparent",
};

export function CelebrationOverlay() {
  const celebration = useHabitQuestStore((state) => state.celebration);
  const dismissCelebration = useHabitQuestStore((state) => state.dismissCelebration);

  return (
    <AnimatePresence>
      {celebration ? (
        <motion.div
          key={celebration.id}
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Dismiss celebration"
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={dismissCelebration}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="relative w-full max-w-lg overflow-hidden rounded-t-[1.5rem] border border-white/15 bg-[rgba(8,14,28,0.92)] p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_30px_80px_rgba(0,0,0,0.55)] sm:rounded-[2rem] sm:p-8"
          >
            <motion.div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${KIND_ACCENT[celebration.kind]}`}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: [0.35, 0.7, 0.45] }}
              transition={{ duration: 2.4, repeat: Infinity }}
            />
            <motion.div
              className="pointer-events-none absolute -left-10 top-8 h-32 w-32 rounded-full bg-cyan-300/20 blur-3xl"
              animate={{ x: [0, 40, 0], y: [0, 18, 0] }}
              transition={{ duration: 3.2, repeat: Infinity }}
            />
            <motion.div
              className="pointer-events-none absolute -right-8 bottom-4 h-36 w-36 rounded-full bg-amber-300/15 blur-3xl"
              animate={{ x: [0, -30, 0], y: [0, -16, 0] }}
              transition={{ duration: 2.8, repeat: Infinity }}
            />

            <div className="relative">
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
                Celebration
              </p>
              <h2 className="section-title mt-3 text-2xl text-white sm:text-3xl md:text-4xl">
                {celebration.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)] md:text-base">
                {celebration.description}
              </p>
              <button
                type="button"
                onClick={dismissCelebration}
                className="mt-6 min-h-12 w-full rounded-full hq-btn-accent px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02] sm:w-auto"
              >
                Continue the run
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
