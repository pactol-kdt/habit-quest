"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { DIFFICULTY_LABELS, RECURRENCE_LABELS, WEEKDAY_LABELS } from "~/lib/habitquest/constants";
import { describeStackFormula, canLinkStackAfter, wouldCreateStackCycle } from "~/lib/habitquest/habit-loop";
import { cn } from "~/lib/ui/cn";
import { emptyHabitFormValues } from "~/lib/habitquest/utils";
import type { Habit, HabitDifficulty, HabitFormValues, HabitRecurrence } from "~/types/habitquest";

interface HabitFormModalProps {
  habit?: Habit | null;
  habits?: Habit[];
  open: boolean;
  onClose: () => void;
  onSubmit: (values: HabitFormValues) => void;
}

export function HabitFormModal({
  habit,
  habits = [],
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
            habits={habits}
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
  habits = [],
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
          stackAfter: habit.stackAfter,
          stackAfterHabitId: habit.stackAfterHabitId,
          cueTime: habit.cueTime,
          cueContext: habit.cueContext,
          identityWhy: habit.identityWhy,
          desiredFeeling: habit.desiredFeeling,
          tinyVersion: habit.tinyVersion,
        }
      : emptyHabitFormValues(),
  );
  const [submitting, setSubmitting] = useState(false);

  const stackableHabits = useMemo(
    () =>
      habits.filter((entry) => {
        if (entry.id === habit?.id) {
          return false;
        }
        if (!canLinkStackAfter(habits, entry.id, habit?.id)) {
          return false;
        }
        if (habit?.id && wouldCreateStackCycle(habits, habit.id, entry.id)) {
          return false;
        }
        return true;
      }),
    [habit?.id, habits],
  );

  const previewHabit = useMemo(
    () =>
      ({
        id: habit?.id ?? "preview",
        title: values.title || "this habit",
        description: values.description,
        difficulty: values.difficulty,
        recurrence: values.recurrence,
        customDays: values.customDays,
        stackAfter: values.stackAfter,
        stackAfterHabitId: values.stackAfterHabitId,
        cueTime: values.cueTime,
        cueContext: values.cueContext,
        identityWhy: values.identityWhy,
        desiredFeeling: values.desiredFeeling,
        tinyVersion: values.tinyVersion,
        createdAt: habit?.createdAt ?? "",
        updatedAt: habit?.updatedAt ?? "",
      }) satisfies Habit,
    [habit, values],
  );

  const stackPreview = describeStackFormula(previewHabit, habits);

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
    if (submitting) {
      return;
    }
    setSubmitting(true);
    onSubmit(values);
    window.setTimeout(() => onClose(), 420);
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
            Habit loop
          </p>
          <h2 className="section-title mt-2 text-2xl text-white md:text-3xl">
            {habit ? "Refine this stack" : "Stack a new habit"}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--color-text-muted)]">
            Design trigger → motivation → response → reward. Habit stacking is the strongest
            trigger: attach the new behavior to something you already do.
          </p>
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
        <section className="rounded-[1.35rem] border border-cyan-300/20 bg-cyan-300/5 p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">1. Trigger · Stack</p>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
            Formula: <span className="text-white">After [current habit], I will [new habit]</span>
            . Chains only — each habit gets one next step (1 → 2 → 3).
          </p>

          <label className="mt-4 grid gap-2">
            <span className="text-sm text-[var(--color-text-muted)]">After I…</span>
            <input
              value={values.stackAfter}
              onChange={(event) => updateField("stackAfter", event.target.value)}
              placeholder="pour coffee / sit at my desk / brush my teeth"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-cyan-300/50 focus:bg-white/7"
            />
          </label>

          {stackableHabits.length ? (
            <div className="mt-4 grid gap-2">
              <span className="text-sm text-[var(--color-text-muted)]">
                Or stack after another HabitQuest habit (open anchors only)
              </span>
              <StackAfterDropdown
                habits={stackableHabits}
                value={values.stackAfterHabitId}
                onChange={(habitId) => updateField("stackAfterHabitId", habitId)}
              />
            </div>
          ) : habits.some((entry) => entry.id !== habit?.id) ? (
            <p className="mt-4 text-xs text-[var(--color-text-muted)]">
              Every habit already has a next step. Edit or clear a link to extend the chain.
            </p>
          ) : null}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm text-[var(--color-text-muted)]">Trigger time (optional)</span>
              <input
                type="time"
                value={values.cueTime ?? ""}
                onChange={(event) => updateField("cueTime", event.target.value || null)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-cyan-300/50"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-[var(--color-text-muted)]">Where / context</span>
              <input
                value={values.cueContext}
                onChange={(event) => updateField("cueContext", event.target.value)}
                placeholder="Kitchen, desk, gym…"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-cyan-300/50"
              />
            </label>
          </div>

          {stackPreview ? (
            <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-cyan-100">
              {stackPreview}
            </p>
          ) : null}
        </section>

        <section className="rounded-[1.35rem] border border-white/10 bg-white/4 p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-amber-200">2. Motivation</p>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm text-[var(--color-text-muted)]">
                Why / identity (“I’m someone who…”)
              </span>
              <input
                value={values.identityWhy}
                onChange={(event) => updateField("identityWhy", event.target.value)}
                placeholder="I'm someone who starts the day in my body"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-amber-300/40"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-[var(--color-text-muted)]">
                Feeling you want after doing it
              </span>
              <input
                value={values.desiredFeeling}
                onChange={(event) => updateField("desiredFeeling", event.target.value)}
                placeholder="Awake, clear, calm…"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-amber-300/40"
              />
            </label>
          </div>
        </section>

        <section className="rounded-[1.35rem] border border-white/10 bg-white/4 p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-white">3. Response</p>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm text-[var(--color-text-muted)]">I will… (habit name)</span>
              <input
                value={values.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="stretch for 5 minutes"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-cyan-300/50 focus:bg-white/7"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-[var(--color-text-muted)]">
                Bare minimum (when resistance hits)
              </span>
              <input
                value={values.tinyVersion}
                onChange={(event) => updateField("tinyVersion", event.target.value)}
                placeholder="Reach for the ceiling once"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-cyan-300/50"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-[var(--color-text-muted)]">Notes</span>
              <textarea
                value={values.description}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="Optional details — keep the action obvious."
                rows={2}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-cyan-300/50 focus:bg-white/7"
              />
            </label>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm text-[var(--color-text-muted)]">Difficulty · reward size</p>
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
          disabled={submitting}
          className="min-h-12 rounded-full border border-white/10 px-5 py-3 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="min-h-12 rounded-full hq-btn-accent px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting
            ? habit
              ? "Saving…"
              : "Creating…"
            : habit
              ? "Save stack"
              : "Create stacked habit"}
        </button>
      </div>
    </motion.div>
  );
}

const NONE_STACK_LABEL = "None — use free-text trigger above";

function StackAfterDropdown({
  habits,
  value,
  onChange,
}: {
  habits: Habit[];
  value: string | null;
  onChange: (habitId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = habits.find((entry) => entry.id === value) ?? null;
  const label = selected?.title.trim() || NONE_STACK_LABEL;

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function choose(habitId: string | null) {
    onChange(habitId);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full min-h-[3.25rem] items-center justify-between gap-3 rounded-2xl border bg-white/5 px-4 py-3 text-left text-sm outline-none transition",
          open
            ? "border-cyan-300/50 text-white"
            : "border-white/10 text-white hover:border-white/20",
        )}
      >
        <span className={cn("min-w-0 truncate", selected ? "text-white" : "text-[var(--color-text-muted)]")}>
          {label}
        </span>
        <span
          aria-hidden
          className={cn(
            "shrink-0 text-[10px] text-cyan-200/80 transition-transform",
            open ? "rotate-180" : "",
          )}
        >
          ▾
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.ul
            role="listbox"
            aria-label="Stack after habit"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-20 max-h-56 overflow-y-auto rounded-[1.25rem] border border-white/10 bg-slate-950/95 p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl"
          >
            <li role="option" aria-selected={!selected}>
              <button
                type="button"
                onClick={() => choose(null)}
                className={cn(
                  "flex w-full rounded-[0.95rem] px-3 py-2.5 text-left text-sm transition",
                  !selected
                    ? "bg-cyan-300/15 text-white"
                    : "text-[var(--color-text-muted)] hover:bg-white/5 hover:text-white",
                )}
              >
                {NONE_STACK_LABEL}
              </button>
            </li>
            {habits.map((entry) => {
              const isActive = entry.id === value;
              return (
                <li key={entry.id} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    onClick={() => choose(entry.id)}
                    className={cn(
                      "flex w-full rounded-[0.95rem] px-3 py-2.5 text-left text-sm transition",
                      isActive
                        ? "bg-cyan-300/15 text-white"
                        : "text-white/90 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <span className="truncate">{entry.title}</span>
                  </button>
                </li>
              );
            })}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
