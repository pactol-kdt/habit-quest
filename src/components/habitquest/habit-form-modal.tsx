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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md"
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
    const normalized = values.recurrence === "custom" && !values.customDays.length
      ? { ...values, customDays: [1, 3, 5] }
      : values;
    onSubmit(normalized);
    onClose();
  }

  return (
    <motion.div
      className="glass-panel w-full max-w-2xl rounded-[2rem] border border-white/10 p-6 md:p-8"
      initial={{ y: 20, opacity: 0, scale: 0.96 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 12, opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
            Habit Setup
          </p>
          <h2 className="section-title mt-2 text-3xl text-white">
            {habit ? "Refine your quest" : "Create a new ritual"}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/10 px-3 py-1 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
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
                    "rounded-2xl border px-3 py-3 text-sm transition",
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
                  onClick={() => updateField("recurrence", key as HabitRecurrence)}
                  className={cn(
                    "rounded-2xl border px-3 py-3 text-sm transition",
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

        {values.recurrence === "custom" ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--color-text-muted)]">Select weekdays</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {WEEKDAY_LABELS.map((label, day) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "rounded-2xl border px-3 py-3 text-sm transition",
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

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/10 px-5 py-3 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="rounded-full bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
        >
          {habit ? "Save changes" : "Create habit"}
        </button>
      </div>
    </motion.div>
  );
}
