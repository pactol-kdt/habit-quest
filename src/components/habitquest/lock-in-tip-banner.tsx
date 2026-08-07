"use client";

import { useEffect, useState } from "react";
import { SETTLEMENT_LOCK_HINT } from "~/lib/habitquest/constants";
import { getTodayDateKey } from "~/lib/habitquest/utils";
import { useHabitQuestStore } from "~/store/habitquest-store";

const TIP_KEY = "habitquest:lockin-tip-dismissed";

export function LockInTipBanner() {
  const hydrated = useHabitQuestStore((state) => state.hydrated);
  const completions = useHabitQuestStore((state) => state.completions);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    try {
      if (sessionStorage.getItem(TIP_KEY) === "1") {
        setVisible(false);
        return;
      }
    } catch {
      // ignore
    }

    const today = getTodayDateKey();
    const hasTodayClear = completions.some((entry) => entry.date === today);
    setVisible(hasTodayClear);
  }, [completions, hydrated]);

  if (!visible) {
    return null;
  }

  return (
    <div className="rounded-[1.35rem] border border-cyan-300/25 bg-cyan-300/8 px-4 py-3 sm:rounded-3xl sm:px-5 sm:py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/80">After a clear</p>
          <p className="mt-1 text-sm leading-6 text-cyan-50">
            That clear is saved, but EXP / season XP / boss damage stay in{" "}
            <span className="font-semibold">Preview</span> until lock-in.{" "}
            {SETTLEMENT_LOCK_HINT} You can still undo today.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.setItem(TIP_KEY, "1");
            } catch {
              // ignore
            }
            setVisible(false);
          }}
          className="min-h-10 shrink-0 rounded-full border border-cyan-200/20 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-300/10"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
