"use client";

import { motion } from "framer-motion";
import { DIFFICULTY_LABELS, CLEARED_TODAY_LABEL } from "~/lib/habitquest/constants";
import {
  describeCraving,
  describeHabitCue,
  describeStackFormula,
  isNextInStack,
} from "~/lib/habitquest/habit-loop";
import { cn } from "~/lib/ui/cn";
import { describeRecurrence, getDifficultyExp } from "~/lib/habitquest/utils";
import type { HabitPendingAction } from "~/store/habitquest-store";
import type { Habit } from "~/types/habitquest";

interface HabitListProps {
  habits: Habit[];
  allHabits?: Habit[];
  completedHabitIds: Set<string>;
  pendingHabitIds?: Set<string> | string[];
  pendingHabitActions?: Record<string, HabitPendingAction>;
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

function pendingHabitLabel(action: HabitPendingAction | undefined) {
  switch (action) {
    case "complete":
      return "Completing…";
    case "uncomplete":
      return "Undoing…";
    case "delete":
      return "Deleting…";
    case "create":
      return "Creating…";
    case "update":
      return "Saving…";
    default:
      return "Working…";
  }
}

export function HabitList({
  habits,
  allHabits,
  completedHabitIds,
  pendingHabitIds,
  pendingHabitActions = {},
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
  const catalog = allHabits ?? habits;

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
        const pendingAction = pendingHabitActions[habit.id];
        const pendingLabel = pendingHabitLabel(pendingAction);
        const stackLine = describeStackFormula(habit, catalog);
        const cueLine = describeHabitCue(habit);
        const craving = describeCraving(habit);
        const isNext = isNextInStack(habit, catalog, completedHabitIds);

        return (
          <motion.article
            key={habit.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className={cn(
              "relative overflow-hidden rounded-[1.35rem] border p-4 transition sm:rounded-3xl sm:p-5",
              completed
                ? "border-amber-300/20 bg-amber-300/8"
                : isNext
                  ? "border-cyan-300/35 bg-cyan-300/8"
                  : "border-white/10 bg-white/4 hover:border-white/18 hover:bg-white/6",
              pendingSync && "opacity-80",
            )}
          >
            {isNext ? (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-cyan-300 shadow-[0_0_18px_4px_rgba(103,232,249,0.55)]"
              />
            ) : null}
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
                    {pendingSync ? pendingLabel : completed ? CLEARED_TODAY_LABEL : "Active"}
                  </span>
                  {isNext ? (
                    <span className="rounded-full bg-cyan-300/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-100 sm:px-3 sm:text-xs sm:tracking-[0.22em]">
                      Next
                    </span>
                  ) : null}
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
                  {stackLine ? (
                    <span className="rounded-full bg-cyan-300/12 px-2.5 py-1 text-[11px] text-cyan-100 sm:px-3 sm:text-xs">
                      Stacked
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
                  {stackLine ? (
                    <p className="text-sm font-medium leading-6 text-cyan-100/90">{stackLine}</p>
                  ) : null}
                  <h3 className="text-lg font-semibold text-white sm:text-xl">{habit.title}</h3>
                  {cueLine ? (
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                      Trigger · {cueLine}
                    </p>
                  ) : null}
                  {!completed && craving ? (
                    <p className="mt-2 text-sm leading-6 text-amber-100/90">
                      Motivation: {craving}
                    </p>
                  ) : null}
                  {!completed && habit.tinyVersion.trim() ? (
                    <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
                      Bare minimum: {habit.tinyVersion}
                    </p>
                  ) : null}
                  {habit.description ? (
                    <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
                      {habit.description}
                    </p>
                  ) : null}
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
                    {pendingSync ? pendingLabel : "Undo clear"}
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
                      ? pendingLabel
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
                  {pendingSync && pendingAction === "delete" ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}
