"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useHabitQuestStore } from "~/store/habitquest-store";
import type { RewardToast } from "~/types/habitquest";

/** Matches Tailwind `lg` — same cutoff as the mobile bottom nav. */
const DESKTOP_MEDIA = "(min-width: 1024px)";
const MAX_VISIBLE_MOBILE = 2;
const MAX_VISIBLE_DESKTOP = 4;
const TOAST_VISIBLE_MS = 3400;
const WARNING_TOAST_MS = 9000;

function useMaxVisibleToasts() {
  const [maxVisible, setMaxVisible] = useState(MAX_VISIBLE_MOBILE);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_MEDIA);

    function sync() {
      setMaxVisible(media.matches ? MAX_VISIBLE_DESKTOP : MAX_VISIBLE_MOBILE);
    }

    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return maxVisible;
}

function toastDuration(toast: RewardToast) {
  return toast.type === "warning" ? WARNING_TOAST_MS : TOAST_VISIBLE_MS;
}

function prioritizeToasts(toasts: RewardToast[], maxVisible: number) {
  const warnings = toasts.filter((toast) => toast.type === "warning");
  const others = toasts.filter((toast) => toast.type !== "warning");
  return [...warnings, ...others].slice(0, maxVisible);
}

export function RewardToastLayer() {
  const rewardToasts = useHabitQuestStore((state) => state.rewardToasts);
  const dismissToast = useHabitQuestStore((state) => state.dismissToast);
  const maxVisible = useMaxVisibleToasts();
  const visibleSinceRef = useRef(new Map<string, number>());

  const visibleToasts = useMemo(
    () => prioritizeToasts(rewardToasts, maxVisible),
    [maxVisible, rewardToasts],
  );
  const queuedCount = Math.max(0, rewardToasts.length - maxVisible);
  const visibleIds = visibleToasts.map((toast) => toast.id).join("|");

  useEffect(() => {
    const activeIds = new Set(rewardToasts.map((toast) => toast.id));
    for (const id of [...visibleSinceRef.current.keys()]) {
      if (!activeIds.has(id)) {
        visibleSinceRef.current.delete(id);
      }
    }

    const visibleIdSet = new Set(visibleToasts.map((toast) => toast.id));
    for (const id of [...visibleSinceRef.current.keys()]) {
      if (!visibleIdSet.has(id)) {
        visibleSinceRef.current.delete(id);
      }
    }

    const now = Date.now();
    const timers: number[] = [];

    for (const toast of visibleToasts) {
      if (!visibleSinceRef.current.has(toast.id)) {
        visibleSinceRef.current.set(toast.id, now);
      }

      const startedAt = visibleSinceRef.current.get(toast.id) ?? now;
      const remaining = Math.max(0, toastDuration(toast) - (now - startedAt));
      timers.push(window.setTimeout(() => dismissToast(toast.id), remaining));
    }

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [dismissToast, rewardToasts, visibleIds, visibleToasts]);

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col gap-2 sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-24 sm:w-full sm:max-w-sm sm:gap-3 lg:bottom-auto lg:top-24">
      <AnimatePresence mode="popLayout">
        {visibleToasts.map((toast) => {
          const isWarning = toast.type === "warning";
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              className={
                isWarning
                  ? "glass-panel pointer-events-auto rounded-3xl border border-rose-300/35 bg-rose-950/70 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.4)]"
                  : "glass-panel pointer-events-auto rounded-3xl border border-white/10 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.4)]"
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  {isWarning ? (
                    <p className="text-[10px] uppercase tracking-[0.2em] text-rose-200/80">
                      Needs attention
                    </p>
                  ) : null}
                  <p className={`text-sm font-semibold text-white ${isWarning ? "mt-1" : ""}`}>
                    {toast.title}
                  </p>
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
          );
        })}
      </AnimatePresence>

      {queuedCount > 0 ? (
        <motion.div
          key={`queued-${queuedCount}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-none self-center rounded-full border border-white/10 bg-slate-950/80 px-3 py-1.5 text-xs text-[var(--color-text-muted)] sm:self-end"
        >
          +{queuedCount} more waiting
        </motion.div>
      ) : null}
    </div>
  );
}
