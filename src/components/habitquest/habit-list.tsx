"use client";

import { motion } from "framer-motion";
import { DIFFICULTY_LABELS } from "~/lib/habitquest/constants";
import { cn } from "~/lib/ui/cn";
import { describeRecurrence, getDifficultyExp } from "~/lib/habitquest/utils";
import type { Habit } from "~/types/habitquest";

interface HabitListProps {
  habits: Habit[];
  completedHabitIds: Set<string>;
  onComplete: (habitId: string) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (habitId: string) => void;
}

export function HabitList({
  habits,
  completedHabitIds,
  onComplete,
  onEdit,
  onDelete,
}: HabitListProps) {
  if (!habits.length) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/4 p-8 text-center text-[var(--color-text-muted)]">
        No active habits are due today. Add a new quest and start farming EXP.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {habits.map((habit, index) => {
        const completed = completedHabitIds.has(habit.id);

        return (
          <motion.article
            key={habit.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className={cn(
              "rounded-3xl border p-5 transition",
              completed
                ? "border-emerald-300/20 bg-emerald-300/8"
                : "border-white/10 bg-white/4 hover:border-white/18 hover:bg-white/6",
            )}
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs uppercase tracking-[0.22em]",
                      completed ? "bg-emerald-300/14 text-emerald-200" : "bg-white/7 text-[var(--color-text-muted)]",
                    )}
                  >
                    {completed ? "Completed" : "Active"}
                  </span>
                  <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs text-cyan-200">
                    {DIFFICULTY_LABELS[habit.difficulty]} • {getDifficultyExp(habit.difficulty)} EXP
                  </span>
                  <span className="rounded-full bg-amber-300/10 px-3 py-1 text-xs text-amber-200">
                    {describeRecurrence(habit)}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">{habit.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
                    {habit.description || "No description set."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onComplete(habit.id)}
                  disabled={completed}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition",
                    completed
                      ? "cursor-not-allowed border border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
                      : "bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-300 text-slate-950 hover:scale-[1.02]",
                  )}
                >
                  {completed ? "Claimed" : "Complete"}
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(habit)}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(habit.id)}
                  className="rounded-full border border-rose-300/20 px-4 py-2 text-sm text-rose-200 transition hover:bg-rose-300/10"
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
