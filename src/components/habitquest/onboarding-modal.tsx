"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { HabitFormModal } from "~/components/habitquest/habit-form-modal";
import { useHabitQuestStore } from "~/store/habitquest-store";

export function OnboardingModal() {
  const hydrated = useHabitQuestStore((state) => state.hydrated);
  const onboardingCompleted = useHabitQuestStore((state) => state.settings.onboardingCompleted);
  const completeOnboarding = useHabitQuestStore((state) => state.completeOnboarding);
  const createHabit = useHabitQuestStore((state) => state.createHabit);
  const [displayName, setDisplayName] = useState("");
  const [habitModalOpen, setHabitModalOpen] = useState(false);

  const openWelcome = hydrated && !onboardingCompleted;

  function finishAndCreate(name: string) {
    completeOnboarding(name);
    setHabitModalOpen(true);
  }

  function finishWithoutHabit(name: string) {
    completeOnboarding(name);
    setHabitModalOpen(false);
  }

  return (
    <>
      <AnimatePresence>
        {openWelcome ? (
          <motion.div
            className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-md sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="glass-panel max-h-[min(92dvh,900px)] w-full max-w-lg overflow-y-auto rounded-t-[1.5rem] border border-white/10 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:rounded-[2rem] md:p-8"
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 12, opacity: 0 }}
            >
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">Welcome</p>
              <h2 className="section-title mt-3 text-2xl text-white sm:text-3xl">
                Start your HabitQuest
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
                Clear habits to earn EXP and coins. Today&apos;s progress is a preview — it locks in
                at midnight so undos stay safe.
              </p>

              <label className="mt-6 grid gap-2">
                <span className="text-sm text-[var(--color-text-muted)]">Display name</span>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  maxLength={32}
                  placeholder="Adventurer"
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-cyan-300/50"
                  autoFocus
                />
              </label>
              <div className="mt-6 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => finishAndCreate(displayName.trim() || "Adventurer")}
                  className="min-h-12 rounded-full hq-btn-accent px-5 py-3 text-sm font-semibold text-slate-950"
                >
                  Create first habit
                </button>
                <button
                  type="button"
                  onClick={() => finishWithoutHabit(displayName.trim() || "Adventurer")}
                  className="min-h-12 rounded-full border border-white/10 px-5 py-3 text-sm text-[var(--color-text-muted)] hover:text-white"
                >
                  Start on the board
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <HabitFormModal
        open={habitModalOpen}
        habit={null}
        onClose={() => setHabitModalOpen(false)}
        onSubmit={(values) => {
          createHabit(values);
          setHabitModalOpen(false);
        }}
      />
    </>
  );
}
