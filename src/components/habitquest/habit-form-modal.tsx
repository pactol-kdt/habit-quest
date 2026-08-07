"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { DIFFICULTY_LABELS, RECURRENCE_LABELS, WEEKDAY_LABELS } from "~/lib/habitquest/constants";
import { cn } from "~/lib/ui/cn";
import type { Habit, HabitDifficulty, HabitFormValues, HabitRecurrence } from "~/types/habitquest";

interface HabitFormModalProps {
  habit?: Habit | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (values: HabitFormValues) => void;
}

const defaultValues: HabitFormValues = {
  title: "",
  description: "",
  difficulty: "easy",
  recurrence: "daily",
  customDays: [],
};

export function HabitFormModal({
  habit,
  open,
  onClose,
  onSubmit,
}: HabitFormModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-md sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <HabitFormDialog
            key={habit?.id ?? "new"}
            habit={habit}
            onClose={onClose}
            onSubmit={onSubmit}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function HabitFormDialog({
  habit,
  onClose,
  onSubmit,
}: Omit<HabitFormModalProps, "open">) {
  const [values, setValues] = useState<HabitFormValues>(() =>
    habit
      ? {
          title: habit.title,
          description: habit.description,
          difficulty: habit.difficulty,
          recurrence: habit.recurrence,
          customDays: habit.customDays,
        }
      : defaultValues,
  );

  function updateField<Key extends keyof HabitFormValues>(key: Key, value: HabitFormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function toggleDay(day: number) {
    setValues((current) => ({
      ...current,
      customDays: current.customDays.includes(day)
        ? current.customDays.filter((value) => value !== day)
        : [...current.customDays, day],
    }));
  }

  function handleSubmit() {
    onSubmit(values);
    onClose();
  }

  return (
    <motion.div
      className="glass-panel max-h-[min(92dvh,900px)] w-full max-w-2xl overflow-y-auto rounded-t-[1.5rem] border border-white/10 p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-[1.75rem] sm:p-5 md:rounded-[2rem] md:p-8"
      initial={{ y: 20, opacity: 0, scale: 0.98 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 12, opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
            Habit Setup
          </p>
          <h2 className="section-title mt-2 text-2xl text-white md:text-3xl">
            {habit ? "Refine your quest" : "Create a new ritual"}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-10 rounded-full border border-white/10 px-3 py-1 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
        >
          Close
        </button>
      </div>

      <div className="grid gap-5">
        <label className="grid gap-2">
          <span className="text-sm text-[var(--color-text-muted)]">Habit name</span>
          <input
            value={values.title}
            onChange={(event) => updateField("title", event.target.value)}
            placeholder="Read 20 pages"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-cyan-300/50 focus:bg-white/7"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm text-[var(--color-text-muted)]">Description</span>
          <textarea
            value={values.description}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Keep it short and actionable."
            rows={3}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-cyan-300/50 focus:bg-white/7"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm text-[var(--color-text-muted)]">Difficulty</p>
          <div className="grid grid-cols-3 gap-2">
              {Object.entries(DIFFICULTY_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => updateField("difficulty", key as HabitDifficulty)}
                  className={cn(
                    "min-h-11 rounded-2xl border px-2 py-3 text-sm transition md:px-3",
                    values.difficulty === key
                      ? "border-cyan-300/60 bg-cyan-300/10 text-white"
                      : "border-white/10 bg-white/5 text-[var(--color-text-muted)] hover:border-white/20 hover:text-white",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-[var(--color-text-muted)]">Recurrence</p>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(RECURRENCE_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    const recurrence = key as HabitRecurrence;
                    setValues((current) => ({
                      ...current,
                      recurrence,
                      customDays:
                        recurrence === "weekly"
                          ? current.customDays.length === 1
                            ? current.customDays
                            : [new Date().getDay()]
                          : recurrence === "custom"
                            ? current.customDays.length
                              ? current.customDays
                              : [1, 3, 5]
                            : [],
                    }));
                  }}
                  className={cn(
                    "min-h-11 rounded-2xl border px-2 py-3 text-sm transition md:px-3",
                    values.recurrence === key
                      ? "border-amber-300/60 bg-amber-300/10 text-white"
                      : "border-white/10 bg-white/5 text-[var(--color-text-muted)] hover:border-white/20 hover:text-white",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {values.recurrence === "custom" || values.recurrence === "weekly" ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--color-text-muted)]">
              {values.recurrence === "weekly" ? "Weekly weekday" : "Select weekdays"}
            </p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {WEEKDAY_LABELS.map((label, day) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    if (values.recurrence === "weekly") {
                      updateField("customDays", [day]);
                      return;
                    }
                    toggleDay(day);
                  }}
                  className={cn(
                    "min-h-11 rounded-2xl border px-2 py-3 text-sm transition md:px-3",
                    values.customDays.includes(day)
                      ? "border-pink-300/60 bg-pink-300/10 text-white"
                      : "border-white/10 bg-white/5 text-[var(--color-text-muted)] hover:border-white/20 hover:text-white",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-8 grid gap-3 sm:flex sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="min-h-12 rounded-full border border-white/10 px-5 py-3 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="min-h-12 rounded-full hq-btn-accent px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
        >
          {habit ? "Save changes" : "Create habit"}
        </button>
      </div>
    </motion.div>
  );
}
