"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useHabitQuestStore } from "~/store/habitquest-store";

export function RewardToastLayer() {
  const rewardToasts = useHabitQuestStore((state) => state.rewardToasts);
  const dismissToast = useHabitQuestStore((state) => state.dismissToast);

  useEffect(() => {
    if (!rewardToasts.length) {
      return;
    }

    const timers = rewardToasts.map((toast) =>
      window.setTimeout(() => dismissToast(toast.id), 3400),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [dismissToast, rewardToasts]);

  return (
    <div className="pointer-events-none fixed right-4 top-24 z-50 flex w-full max-w-sm flex-col gap-3">
      <AnimatePresence>
        {rewardToasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 30, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 30, scale: 0.96 }}
            className="glass-panel pointer-events-auto rounded-3xl border border-white/10 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.4)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{toast.title}</p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">{toast.description}</p>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="text-xs text-[var(--color-text-muted)] transition hover:text-white"
              >
                Close
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
