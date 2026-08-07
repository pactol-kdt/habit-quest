"use client";

import { useMemo, useState } from "react";
import { GlassCard } from "~/components/habitquest/glass-card";
import { HabitFormModal } from "~/components/habitquest/habit-form-modal";
import { HabitList } from "~/components/habitquest/habit-list";
import { cn } from "~/lib/ui/cn";
import {
  getDueHabitsForDate,
  getTodayDateKey,
  hasCompletionForDate,
} from "~/lib/habitquest/utils";
import { useHabitQuestStore } from "~/store/habitquest-store";
import type { Habit } from "~/types/habitquest";

type HabitsFilter = "all" | "due" | "completed";

export function HabitsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [filter, setFilter] = useState<HabitsFilter>("all");

  const {
    hydrated,
    habits,
    completions,
    createHabit,
    updateHabit,
    deleteHabit,
    completeHabitForToday,
    uncompleteHabitForToday,
    pendingHabitIds,
  } = useHabitQuestStore((state) => state);

  const today = getTodayDateKey();
  const dueHabits = useMemo(() => getDueHabitsForDate(habits, today), [habits, today]);
  const dueHabitIds = useMemo(() => new Set(dueHabits.map((habit) => habit.id)), [dueHabits]);

  const completedHabitIds = useMemo(
    () =>
      new Set(
        habits
          .filter((habit) => hasCompletionForDate(completions, habit.id, today))
          .map((habit) => habit.id),
      ),
    [completions, habits, today],
  );

  const visibleHabits = useMemo(() => {
    if (filter === "due") {
      return dueHabits;
    }

    if (filter === "completed") {
      return habits.filter((habit) => completedHabitIds.has(habit.id));
    }

    return habits;
  }, [completedHabitIds, dueHabits, filter, habits]);

  if (!hydrated) {
    return (
      <div className="grid gap-4 pt-4 md:gap-6 md:pt-6">
        <div className="glass-panel h-40 animate-pulse rounded-[2rem]" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 pt-4 md:gap-6 md:pt-6">
      <GlassCard className="rounded-[1.75rem] p-4 md:rounded-[2rem] md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
              Habit Codex
            </p>
            <h1 className="section-title mt-2 text-2xl text-white sm:text-4xl md:text-5xl">
              All habits
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)] md:text-base">
              Manage every ritual, not just today&apos;s due board. Delete cleans completions so stats stay honest.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingHabit(null);
              setModalOpen(true);
            }}
            className="min-h-12 w-full rounded-full hq-btn-accent px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02] sm:w-auto lg:self-auto"
          >
            Create habit
          </button>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="scrollbar-none -mx-1 mb-5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {(
            [
              ["all", `All (${habits.length})`],
              ["due", `Due today (${dueHabits.length})`],
              ["completed", `Done today (${completedHabitIds.size})`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "min-h-11 shrink-0 snap-start rounded-full px-4 py-2 text-sm transition",
                filter === value
                  ? "bg-white/10 text-white"
                  : "bg-white/5 text-[var(--color-text-muted)] hover:text-white",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <HabitList
          habits={visibleHabits}
          completedHabitIds={completedHabitIds}
          pendingHabitIds={pendingHabitIds}
          showDueBadge
          dueHabitIds={dueHabitIds}
          emptyMessage={
            filter === "all"
              ? "No habits yet. Create your first ritual to start farming EXP."
              : filter === "due"
                ? "Nothing is due today. Try All or create a daily habit."
                : "Nothing cleared today yet. Complete a due habit to see it here."
          }
          emptyActionLabel={filter === "all" || filter === "due" ? "Create habit" : undefined}
          onEmptyAction={
            filter === "all" || filter === "due"
              ? () => {
                  setEditingHabit(null);
                  setModalOpen(true);
                }
              : undefined
          }
          onComplete={completeHabitForToday}
          onUncomplete={uncompleteHabitForToday}
          onEdit={(habit) => {
            setEditingHabit(habit);
            setModalOpen(true);
          }}
          onDelete={deleteHabit}
        />
      </GlassCard>

      <HabitFormModal
        open={modalOpen}
        habit={editingHabit}
        onClose={() => setModalOpen(false)}
        onSubmit={(values) => {
          if (editingHabit) {
            updateHabit(editingHabit.id, values);
            return;
          }
          createHabit(values);
        }}
      />
    </div>
  );
}
