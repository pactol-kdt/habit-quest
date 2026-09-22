"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useHabitQuestStore } from "~/store/habitquest-store";

const WARNING_MS = 9000;

export function RewardToastLayer() {
  const rewardToasts = useHabitQuestStore((state) => state.rewardToasts);
  const dismissToast = useHabitQuestStore((state) => state.dismissToast);
  const warning = rewardToasts.find((toast) => toast.type === "warning") ?? null;

  useEffect(() => {
    if (!warning) {
      return;
    }

    const timer = window.setTimeout(() => dismissToast(warning.id), WARNING_MS);
    return () => window.clearTimeout(timer);
  }, [dismissToast, warning]);

  return (
    <div className="pointer-events-none fixed inset-x-3 top-[calc(4.5rem+env(safe-area-inset-top))] z-50 flex justify-center sm:inset-x-auto sm:right-4 sm:top-24 sm:justify-end">
      <AnimatePresence>
        {warning ? (
          <motion.div
            key={warning.id}
            role="status"
            aria-live="assertive"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="pointer-events-auto flex max-w-sm items-start gap-3 rounded-2xl border border-rose-300/30 bg-rose-950/80 px-3 py-2.5 text-sm shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
          >
            <p className="min-w-0 text-rose-50">
              <span className="font-semibold">{warning.title}</span>
              {warning.description ? (
                <span className="mt-0.5 block text-rose-100/75">{warning.description}</span>
              ) : null}
            </p>
            <button
              type="button"
              onClick={() => dismissToast(warning.id)}
              className="shrink-0 text-xs text-rose-200/70 transition hover:text-white"
            >
              Close
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
