"use client";

import { motion } from "framer-motion";
import { DIFFICULTY_LABELS, CLEARED_TODAY_LABEL } from "~/lib/habitquest/constants";
import { cn } from "~/lib/ui/cn";
import { describeRecurrence, getDifficultyExp } from "~/lib/habitquest/utils";
import type { Habit } from "~/types/habitquest";

interface HabitListProps {
  habits: Habit[];
  completedHabitIds: Set<string>;
  pendingHabitIds?: Set<string> | string[];
  emptyMessage?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  showDueBadge?: boolean;
  dueHabitIds?: Set<string>;
  onComplete: (habitId: string) => void;
  onUncomplete?: (habitId: string) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (habitId: string) => void;
}

export function HabitList({
  habits,
  completedHabitIds,
  pendingHabitIds,
  emptyMessage = "No habits are due today.",
  emptyActionLabel,
  onEmptyAction,
  showDueBadge = false,
  dueHabitIds,
  onComplete,
  onUncomplete,
  onEdit,
  onDelete,
}: HabitListProps) {
  if (!habits.length) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/4 p-8 text-center">
        <p className="text-[var(--color-text-muted)]">{emptyMessage}</p>
        {onEmptyAction && emptyActionLabel ? (
          <button
            type="button"
            onClick={onEmptyAction}
            className="mt-4 rounded-full hq-btn-accent px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
          >
            {emptyActionLabel}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {habits.map((habit, index) => {
        const completed = completedHabitIds.has(habit.id);
        const dueToday = dueHabitIds?.has(habit.id) ?? true;
        const pendingSync = Array.isArray(pendingHabitIds)
          ? pendingHabitIds.includes(habit.id)
          : Boolean(pendingHabitIds?.has(habit.id));

        return (
          <motion.article
            key={habit.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className={cn(
              "rounded-[1.35rem] border p-4 transition sm:rounded-3xl sm:p-5",
              completed
                ? "border-amber-300/20 bg-amber-300/8"
                : "border-white/10 bg-white/4 hover:border-white/18 hover:bg-white/6",
              pendingSync && "opacity-80",
            )}
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] sm:px-3 sm:text-xs sm:tracking-[0.22em]",
                      completed
                        ? "bg-amber-300/14 text-amber-100"
                        : "bg-white/7 text-[var(--color-text-muted)]",
                    )}
                  >
                    {pendingSync ? "Saving…" : completed ? CLEARED_TODAY_LABEL : "Active"}
                  </span>
                  {showDueBadge ? (
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] sm:px-3 sm:text-xs sm:tracking-[0.22em]",
                        dueToday
                          ? "bg-cyan-300/10 text-cyan-200"
                          : "bg-white/7 text-[var(--color-text-muted)]",
                      )}
                    >
                      {dueToday ? "Due today" : "Not due"}
                    </span>
                  ) : null}
                  <span className="rounded-full bg-cyan-300/10 px-2.5 py-1 text-[11px] text-cyan-200 sm:px-3 sm:text-xs">
                    {DIFFICULTY_LABELS[habit.difficulty]} • {getDifficultyExp(habit.difficulty)} EXP
                  </span>
                  <span className="rounded-full bg-amber-300/10 px-2.5 py-1 text-[11px] text-amber-200 sm:px-3 sm:text-xs">
                    {describeRecurrence(habit)}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-white sm:text-xl">{habit.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
                    {habit.description || "No description set."}
                  </p>
                </div>
              </div>

              <div className="grid w-full grid-cols-2 gap-2 xl:w-auto xl:flex xl:flex-wrap xl:items-center">
                {completed && onUncomplete ? (
                  <button
                    type="button"
                    onClick={() => onUncomplete(habit.id)}
                    disabled={pendingSync}
                    className={cn(
                      "col-span-2 min-h-12 rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2.5 text-sm text-amber-100 transition xl:col-span-1 xl:min-h-11",
                      pendingSync
                        ? "cursor-not-allowed opacity-60"
                        : "hover:bg-amber-300/16",
                    )}
                  >
                    {pendingSync ? "Saving…" : "Undo clear"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onComplete(habit.id)}
                    disabled={pendingSync || completed || (showDueBadge && !dueToday)}
                    className={cn(
                      "col-span-2 min-h-12 rounded-full px-4 py-2.5 text-sm font-medium transition xl:col-span-1 xl:min-h-11",
                      pendingSync || completed || (showDueBadge && !dueToday)
                        ? "cursor-not-allowed border border-white/10 bg-white/5 text-[var(--color-text-muted)]"
                        : "hq-btn-accent text-slate-950 active:scale-[0.98] hover:scale-[1.02]",
                    )}
                  >
                    {pendingSync
                      ? "Saving…"
                      : completed
                        ? CLEARED_TODAY_LABEL
                        : showDueBadge && !dueToday
                          ? "Not due"
                          : "Complete"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onEdit(habit)}
                  disabled={pendingSync}
                  className="min-h-11 rounded-full border border-white/10 px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(habit.id)}
                  disabled={pendingSync}
                  className="min-h-11 rounded-full border border-rose-300/20 px-4 py-2 text-sm text-rose-200 transition hover:bg-rose-300/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}
