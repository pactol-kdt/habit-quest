"use client";

import { useState } from "react";
import { HabitFormModal } from "~/components/habitquest/habit-form-modal";
import { GlassCard } from "~/components/habitquest/glass-card";
import { buildWeeklyReview, reviewOpensEasierSection } from "@habitquest/shared";
import { getTodayDateKey } from "~/lib/habitquest/utils";
import { useHabitQuestStore } from "~/store/habitquest-store";
import type { WeeklyReviewInsight } from "@habitquest/shared";
import type { Habit } from "~/types/habitquest";

export function WeeklyReviewCard() {
  const hydrated = useHabitQuestStore((state) => state.hydrated);
  const habits = useHabitQuestStore((state) => state.habits);
  const completions = useHabitQuestStore((state) => state.completions);
  const projectSave = useHabitQuestStore((state) => state.projectSave);
  const updateHabit = useHabitQuestStore((state) => state.updateHabit);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [easierFocus, setEasierFocus] = useState(false);

  if (!hydrated) {
    return null;
  }

  const review = buildWeeklyReview(
    {
      ...projectSave(),
      habits,
      completions,
    },
    getTodayDateKey(),
  );
  const insights = review.insights.filter((insight) => !dismissed.has(insight.id));

  function openInsight(insight: WeeklyReviewInsight) {
    if (insight.action === "keep" || !insight.habitId) {
      setDismissed((current) => new Set(current).add(insight.id));
      return;
    }
    const habit = habits.find((entry) => entry.id === insight.habitId) ?? null;
    if (!habit) {
      return;
    }
    setEasierFocus(reviewOpensEasierSection(insight.action));
    setEditingHabit(habit);
  }

  return (
    <>
      <GlassCard className="rounded-[1.75rem] p-4 md:p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">Review</p>
        <h2 className="section-title mt-2 text-2xl text-white">How the last two weeks went</h2>
        {insights.length ? (
          <ul className="mt-4 grid gap-3">
            {insights.map((insight) => (
              <li
                key={insight.id}
                className="rounded-2xl border border-white/10 bg-white/4 px-4 py-3"
              >
                <p className="font-semibold text-white">{insight.title}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">{insight.body}</p>
                <button
                  type="button"
                  onClick={() => openInsight(insight)}
                  className="mt-3 min-h-11 rounded-full border border-white/15 px-4 py-2 text-sm text-white transition hover:border-white/30"
                >
                  {insight.actionLabel}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{review.emptyMessage}</p>
        )}
      </GlassCard>
      <HabitFormModal
        open={Boolean(editingHabit)}
        habit={editingHabit}
        habits={habits}
        initialFocus={easierFocus ? "easier" : null}
        onClose={() => setEditingHabit(null)}
        onSubmit={(values) => {
          if (!editingHabit) {
            return;
          }
          updateHabit(editingHabit.id, values);
        }}
      />
    </>
  );
}
