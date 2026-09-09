"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ConfirmDialog } from "~/components/habitquest/confirm-dialog";
import { CLEARED_TODAY_LABEL } from "~/lib/habitquest/constants";
import {
  describeHabitCue,
  describeStackFormula,
  isNextInStack,
} from "~/lib/habitquest/habit-loop";
import { cn } from "~/lib/ui/cn";
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
      return "Clearing…";
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
  const [menuHabit, setMenuHabit] = useState<Habit | null>(null);
  const [deleteHabit, setDeleteHabit] = useState<Habit | null>(null);

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
    <>
      <div className="space-y-3">
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
          const isNext = isNextInStack(habit, catalog, completedHabitIds);
          const notDue = showDueBadge && !dueToday;
          const subtitle = stackLine || cueLine;

          return (
            <motion.article
              key={habit.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={cn(
                "relative rounded-[1.35rem] border p-4 transition sm:rounded-3xl sm:p-5",
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
                  className="pointer-events-none absolute inset-y-3 left-0 w-1 rounded-full bg-cyan-300 shadow-[0_0_18px_4px_rgba(103,232,249,0.55)]"
                />
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className={cn("min-w-0", isNext && "pl-2")}>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-white sm:text-xl">{habit.title}</h3>
                    {isNext ? (
                      <span className="rounded-full bg-cyan-300/20 px-2 py-0.5 text-[11px] uppercase tracking-[0.16em] text-cyan-100">
                        Next
                      </span>
                    ) : null}
                    {showDueBadge ? (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] uppercase tracking-[0.16em]",
                          dueToday
                            ? "bg-cyan-300/10 text-cyan-200"
                            : "bg-white/7 text-[var(--color-text-muted)]",
                        )}
                      >
                        {dueToday ? "Due today" : "Not due"}
                      </span>
                    ) : null}
                    {pendingSync ? (
                      <span className="text-xs text-[var(--color-text-muted)]">{pendingLabel}</span>
                    ) : null}
                  </div>
                  {subtitle ? (
                    <p className="mt-1 truncate text-sm text-[var(--color-text-muted)]">{subtitle}</p>
                  ) : null}
                  {!completed && habit.tinyVersion.trim() ? (
                    <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
                      Bare minimum: {habit.tinyVersion.trim()}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {completed && onUncomplete ? (
                    <button
                      type="button"
                      onClick={() => onUncomplete(habit.id)}
                      disabled={pendingSync}
                      className={cn(
                        "min-h-12 flex-1 rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2.5 text-sm text-amber-100 transition sm:min-h-11 sm:flex-none",
                        pendingSync ? "cursor-not-allowed opacity-60" : "hover:bg-amber-300/16",
                      )}
                    >
                      {pendingSync ? pendingLabel : "Undo clear"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onComplete(habit.id)}
                      disabled={pendingSync || completed || notDue}
                      className={cn(
                        "min-h-12 flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition sm:min-h-11 sm:flex-none sm:px-5",
                        pendingSync || completed || notDue
                          ? "cursor-not-allowed border border-white/10 bg-white/5 text-[var(--color-text-muted)]"
                          : "hq-btn-accent text-slate-950 active:scale-[0.98] hover:scale-[1.02]",
                      )}
                    >
                      {pendingSync
                        ? pendingLabel
                        : completed
                          ? CLEARED_TODAY_LABEL
                          : notDue
                            ? "Not due"
                            : "Clear"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setMenuHabit(habit)}
                    disabled={pendingSync}
                    aria-haspopup="dialog"
                    aria-label={`More actions for ${habit.title}`}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:w-11"
                  >
                    <MoreGlyph />
                  </button>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>

      <ConfirmDialog
        open={Boolean(menuHabit) && !deleteHabit}
        title={menuHabit?.title ?? "Habit"}
        description="Edit the loop or remove this habit."
        onClose={() => setMenuHabit(null)}
      >
        <button
          type="button"
          onClick={() => {
            if (!menuHabit) {
              return;
            }
            onEdit(menuHabit);
            setMenuHabit(null);
          }}
          className="min-h-12 rounded-full hq-btn-accent px-5 py-3 text-sm font-semibold text-slate-950"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => {
            setDeleteHabit(menuHabit);
            setMenuHabit(null);
          }}
          className="min-h-12 rounded-full border border-rose-300/25 px-5 py-3 text-sm text-rose-200 hover:bg-rose-300/10"
        >
          Delete
        </button>
        <button
          type="button"
          onClick={() => setMenuHabit(null)}
          className="min-h-12 rounded-full border border-white/10 px-5 py-3 text-sm text-[var(--color-text-muted)] hover:text-white"
        >
          Cancel
        </button>
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(deleteHabit)}
        title={`Delete ${deleteHabit?.title ?? "this habit"}?`}
        description="This removes the habit and its history from your run. You cannot undo it."
        onClose={() => setDeleteHabit(null)}
      >
        <button
          type="button"
          onClick={() => setDeleteHabit(null)}
          className="min-h-12 rounded-full border border-white/10 px-5 py-3 text-sm text-[var(--color-text-muted)] hover:text-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            if (!deleteHabit) {
              return;
            }
            onDelete(deleteHabit.id);
            setDeleteHabit(null);
          }}
          className="min-h-12 rounded-full border border-rose-300/30 bg-rose-300/15 px-5 py-3 text-sm font-semibold text-rose-100 hover:bg-rose-300/25"
        >
          Delete habit
        </button>
      </ConfirmDialog>
    </>
  );
}

function MoreGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}
