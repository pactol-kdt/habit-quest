"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { ExpIcon } from "~/components/habitquest/icons/exp-icon";
import { useDialogA11y } from "~/hooks/use-dialog-a11y";
import { DIFFICULTY_LABELS, RECURRENCE_LABELS, WEEKDAY_LABELS } from "~/lib/habitquest/constants";
import {
  describeHabitCue,
  describeStackFormula,
  canLinkStackAfter,
  wouldCreateStackCycle,
} from "~/lib/habitquest/habit-loop";
import { cn } from "~/lib/ui/cn";
import { emptyHabitFormValues, getDifficultyExp } from "~/lib/habitquest/utils";
import type { Habit, HabitDifficulty, HabitFormValues, HabitRecurrence } from "~/types/habitquest";

type StackMode = "cue" | "habit";

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
          onClick={onClose}
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
  const [stackMode, setStackMode] = useState<StackMode>(() =>
    habit?.stackAfterHabitId ? "habit" : "cue",
  );
  const [submitting, setSubmitting] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(Boolean(habit));
  const panelRef = useRef<HTMLDivElement>(null);
  const isCreate = !habit;
  const canSubmit = values.title.trim().length > 0 && !submitting;

  useDialogA11y(panelRef, onClose);

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

  const canLinkHabits = stackableHabits.length > 0 || Boolean(values.stackAfterHabitId);
  const activeStackMode = canLinkHabits ? stackMode : "cue";

  const previewHabit = useMemo(
    () =>
      ({
        id: habit?.id ?? "preview",
        title: values.title || "this habit",
        description: values.description,
        difficulty: values.difficulty,
        recurrence: values.recurrence,
        customDays: values.customDays,
        stackAfter: activeStackMode === "cue" ? values.stackAfter : "",
        stackAfterHabitId: activeStackMode === "habit" ? values.stackAfterHabitId : null,
        cueTime: values.cueTime,
        cueContext: values.cueContext,
        identityWhy: values.identityWhy,
        desiredFeeling: values.desiredFeeling,
        tinyVersion: values.tinyVersion,
        createdAt: habit?.createdAt ?? "",
        updatedAt: habit?.updatedAt ?? "",
      }) satisfies Habit,
    [activeStackMode, habit, values],
  );

  const stackPreview = describeStackFormula(previewHabit, habits);
  const cueLine = describeHabitCue(previewHabit);
  const selectedAnchor = habits.find((entry) => entry.id === values.stackAfterHabitId);
  const afterLabel =
    activeStackMode === "habit"
      ? selectedAnchor?.title.trim() || ""
      : values.stackAfter.trim();

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
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    onSubmit({
      ...values,
      stackAfter: activeStackMode === "habit" ? "" : values.stackAfter,
      stackAfterHabitId: activeStackMode === "habit" ? values.stackAfterHabitId : null,
    });
    window.setTimeout(() => onClose(), 420);
  }

  return (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="habit-form-title"
      tabIndex={-1}
      className="glass-panel flex max-h-[min(92dvh,900px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[1.5rem] border border-white/10 outline-none sm:rounded-[1.75rem] md:rounded-[2rem]"
      initial={{ y: 20, opacity: 0, scale: 0.98 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 12, opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-5 sm:pt-5 md:px-8 md:pt-8">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
            Habit loop
          </p>
          <h2 id="habit-form-title" className="section-title mt-2 text-2xl text-white md:text-3xl">
            {habit ? "Refine this habit" : "New habit"}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--color-text-muted)]">
            {isCreate
              ? "Name the cue you already do, then the new action. Optional details can wait."
              : "Hook it onto something you already do, then refine why it matters and the smallest version you can still finish."}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-10 shrink-0 rounded-full border border-white/10 px-3 py-1 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
        >
          Close
        </button>
      </div>

      <div className="grid flex-1 gap-5 overflow-y-auto px-4 py-5 sm:px-5 md:px-8 md:py-6">
        <section className="rounded-[1.35rem] border border-cyan-300/20 bg-cyan-300/5 p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">1. Trigger</p>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
            Write the automatic moment, not the new habit. Chains stay 1 → 2 → 3 — each habit
            can have only one next step.
          </p>

          {canLinkHabits ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <StackModeButton
                active={activeStackMode === "cue"}
                label="A moment I already do"
                onClick={() => setStackMode("cue")}
              />
              <StackModeButton
                active={activeStackMode === "habit"}
                label="Another habit"
                onClick={() => setStackMode("habit")}
              />
            </div>
          ) : null}

          {activeStackMode === "habit" ? (
            <div className="mt-4 grid gap-2">
              <span className="text-sm text-[var(--color-text-muted)]">After I clear…</span>
              <StackAfterDropdown
                habits={stackableHabits}
                value={values.stackAfterHabitId}
                onChange={(habitId) => updateField("stackAfterHabitId", habitId)}
              />
              <p className="text-xs leading-5 text-[var(--color-text-muted)]">
                This habit glows Next once that one is cleared today.
              </p>
            </div>
          ) : (
            <label className="mt-4 grid gap-2">
              <span className="text-sm text-[var(--color-text-muted)]">After I…</span>
              <input
                value={values.stackAfter}
                onChange={(event) => updateField("stackAfter", event.target.value)}
                placeholder="pour coffee, sit at my desk, brush my teeth"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-cyan-300/50 focus:bg-white/7"
              />
            </label>
          )}

          {!canLinkHabits && habits.some((entry) => entry.id !== habit?.id) ? (
            <p className="mt-3 text-xs leading-5 text-[var(--color-text-muted)]">
              Every habit already has a next step. Edit or clear a link if you want to extend
              the chain.
            </p>
          ) : null}

          <label className="mt-4 grid gap-2">
            <span className="text-sm text-[var(--color-text-muted)]">I will…</span>
            <input
              value={values.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="stretch for 5 minutes"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-cyan-300/50 focus:bg-white/7"
            />
          </label>

          <StackFormulaPreview after={afterLabel} will={values.title} cueLine={cueLine} formula={stackPreview} />
        </section>

        {isCreate ? (
          <button
            type="button"
            onClick={() => setAdvancedOpen((current) => !current)}
            aria-expanded={advancedOpen}
            className="min-h-11 rounded-full border border-white/10 px-4 py-2.5 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
          >
            {advancedOpen ? "Hide optional details" : "Add optional details"}
          </button>
        ) : null}

        {advancedOpen ? (
          <>
        <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm text-[var(--color-text-muted)]">Time (optional)</span>
              <input
                type="time"
                value={values.cueTime ?? ""}
                onChange={(event) => updateField("cueTime", event.target.value || null)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-cyan-300/50"
              />
              <span className="text-xs leading-5 text-[var(--color-text-muted)]">
                Optional cue for today&apos;s list — not an alarm.
              </span>
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-[var(--color-text-muted)]">Where</span>
              <input
                value={values.cueContext}
                onChange={(event) => updateField("cueContext", event.target.value)}
                placeholder="Kitchen, desk, gym…"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-cyan-300/50"
              />
            </label>
          </div>

        <section className="rounded-[1.35rem] border border-white/10 bg-white/4 p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-amber-200">2. Motivation</p>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
            Give the habit a reason you care about — identity, feeling, or both.
          </p>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm text-[var(--color-text-muted)]">I&apos;m someone who…</span>
              <input
                value={values.identityWhy}
                onChange={(event) => updateField("identityWhy", event.target.value)}
                placeholder="starts the day in my body"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-amber-300/40"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-[var(--color-text-muted)]">I want to feel</span>
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
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
            Keep a fallback so a hard day still counts. One reach, one page, one minute.
          </p>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm text-[var(--color-text-muted)]">Bare minimum</span>
              <input
                value={values.tinyVersion}
                onChange={(event) => updateField("tinyVersion", event.target.value)}
                placeholder="Reach for the ceiling once"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-cyan-300/50"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-[var(--color-text-muted)]">Notes (optional)</span>
              <textarea
                value={values.description}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="Anything that makes the action obvious."
                rows={2}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-cyan-300/50 focus:bg-white/7"
              />
            </label>
          </div>
        </section>

        <section className="rounded-[1.35rem] border border-white/10 bg-white/4 p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-pink-200">4. Reward</p>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
            The feeling is the real payoff. Difficulty only sizes pending EXP — it banks at
            midnight, so undos stay safe.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-text-muted)]">Difficulty</p>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(DIFFICULTY_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => updateField("difficulty", key as HabitDifficulty)}
                    className={cn(
                      "min-h-11 rounded-2xl border px-2 py-2.5 text-sm transition md:px-3",
                      values.difficulty === key
                        ? "border-cyan-300/60 bg-cyan-300/10 text-white"
                        : "border-white/10 bg-white/5 text-[var(--color-text-muted)] hover:border-white/20 hover:text-white",
                    )}
                  >
                    <span className="block">{label}</span>
                    <span className="mt-0.5 inline-flex items-center justify-center gap-1 text-[11px] opacity-70">
                      <ExpIcon size={11} />
                      {getDifficultyExp(key as HabitDifficulty)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-[var(--color-text-muted)]">How often</p>
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
            <div className="mt-4 space-y-3">
              <p className="text-sm text-[var(--color-text-muted)]">
                {values.recurrence === "weekly" ? "Which weekday" : "Which days"}
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
        </section>
          </>
        ) : null}
      </div>

      <div className="grid gap-3 border-t border-white/10 bg-slate-950/40 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:flex sm:flex-row sm:justify-end sm:px-5 md:px-8">
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
          disabled={!canSubmit}
          className="min-h-12 rounded-full hq-btn-accent px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting
            ? habit
              ? "Saving…"
              : "Creating…"
            : habit
              ? "Save habit"
              : "Add this habit"}
        </button>
      </div>
    </motion.div>
  );
}

function StackModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-2xl border px-3 py-2.5 text-sm transition",
        active
          ? "border-cyan-300/60 bg-cyan-300/10 text-white"
          : "border-white/10 bg-white/5 text-[var(--color-text-muted)] hover:border-white/20 hover:text-white",
      )}
    >
      {label}
    </button>
  );
}

function StackFormulaPreview({
  after,
  will,
  cueLine,
  formula,
}: {
  after: string;
  will: string;
  cueLine: string | null;
  formula: string | null;
}) {
  const hasAfter = after.trim().length > 0;
  const hasWill = will.trim().length > 0;

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/80">Your formula</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <PreviewChip muted={!hasAfter}>{hasAfter ? after : "the cue"}</PreviewChip>
        <span aria-hidden className="text-cyan-200/70">
          →
        </span>
        <PreviewChip muted={!hasWill}>{hasWill ? will : "the new habit"}</PreviewChip>
      </div>
      <p className="mt-3 text-sm leading-6 text-cyan-100">
        {formula ?? "After [cue], I will [habit]"}
      </p>
      {cueLine ? (
        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
          {cueLine}
        </p>
      ) : null}
    </div>
  );
}

function PreviewChip({ children, muted }: { children: string; muted: boolean }) {
  return (
    <span
      className={cn(
        "max-w-full truncate rounded-full px-3 py-1.5 text-sm",
        muted ? "bg-white/5 text-[var(--color-text-muted)]" : "bg-cyan-300/15 text-cyan-50",
      )}
    >
      {children}
    </span>
  );
}

const NONE_STACK_LABEL = "Choose a habit";

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
