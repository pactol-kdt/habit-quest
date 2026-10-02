"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ConfirmDialog } from "~/components/habitquest/confirm-dialog";
import { ExpIcon } from "~/components/habitquest/icons/exp-icon";
import { useDialogA11y } from "~/hooks/use-dialog-a11y";
import { CLEARED_TODAY_LABEL, DIFFICULTY_LABELS } from "~/lib/habitquest/constants";
import { describeRecurrence, formatNumber, getDifficultyExp } from "~/lib/habitquest/utils";
import {
  describeHabitCue,
  describeStackFormula,
  isNextInStack,
} from "~/lib/habitquest/habit-loop";
import { shouldOfferReflection } from "@habitquest/shared";
import { cn } from "~/lib/ui/cn";
import type { HabitPendingAction } from "~/store/habitquest-store";
import type { CompletionReflection, CompletionReflectionRecord, Habit, HabitCompletion } from "~/types/habitquest";

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
  onCompleteMinimum?: (habitId: string) => void;
  onReflect?: (habitId: string, reflection: CompletionReflectionRecord) => void;
  completions?: HabitCompletion[];
  dateKey?: string;
  onUncomplete?: (habitId: string) => void;
  /** Return a warning when undo would reclaim spent coins into a negative wallet. */
  evaluateUndo?: (habitId: string) => {
    clawback: number;
    coinsAfter: number;
  } | null;
  onEdit: (habit: Habit) => void;
  onDelete: (habitId: string) => void;
}

function pendingHabitLabel(action: HabitPendingAction | undefined) {
  switch (action) {
    case "complete":
      return "Finishing…";
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
  onCompleteMinimum,
  onReflect,
  completions = [],
  dateKey = "",
  onUncomplete,
  evaluateUndo,
  onEdit,
  onDelete,
}: HabitListProps) {
  const catalog = allHabits ?? habits;
  const [menuHabit, setMenuHabit] = useState<Habit | null>(null);
  const [deleteHabit, setDeleteHabit] = useState<Habit | null>(null);
  const [undoWarn, setUndoWarn] = useState<{
    habit: Habit;
    clawback: number;
    coinsAfter: number;
  } | null>(null);

  const reflectionHabitId = (() => {
    if (!onReflect || !dateKey) {
      return null;
    }
    const latest = completions
      .filter((entry) => entry.date === dateKey)
      .sort((left, right) => right.completedAt.localeCompare(left.completedAt))[0];
    if (!latest || latest.reflection) {
      return null;
    }
    const habit = catalog.find((entry) => entry.id === latest.habitId);
    if (!habit || !shouldOfferReflection(completions, habit, latest)) {
      return null;
    }
    return habit.id;
  })();

  function requestUncomplete(habit: Habit) {
    if (!onUncomplete) {
      return;
    }
    const warning = evaluateUndo?.(habit.id) ?? null;
    if (warning) {
      setUndoWarn({ habit, ...warning });
      return;
    }
    onUncomplete(habit.id);
  }

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
          const todayCompletion = completions.find(
            (entry) => entry.habitId === habit.id && entry.date === dateKey,
          );
          const tiny = habit.tinyVersion.trim();

          return (
            <motion.article
              key={`${habit.id}-${completed ? "done" : "open"}`}
              initial={completed ? { scale: 1.03, opacity: 0.85 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: completed ? 0 : index * 0.03, type: "spring", stiffness: 380, damping: 24 }}
              className={cn(
                "relative min-w-0 overflow-hidden rounded-[1.35rem] border p-4 transition sm:rounded-3xl sm:p-5",
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

              <div className={cn("flex min-w-0 items-center gap-3", isNext && "pl-2")}>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <h3 className="min-w-0 truncate text-base font-semibold text-white sm:text-xl">
                      {habit.title}
                    </h3>
                    {isNext ? (
                      <span className="shrink-0 rounded-full bg-cyan-300/20 px-2 py-0.5 text-[11px] uppercase tracking-[0.16em] text-cyan-100">
                        Next
                      </span>
                    ) : null}
                  </div>
                  {showDueBadge || pendingSync ? (
                    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
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
                  ) : null}
                  {subtitle ? (
                    <p className="mt-1 truncate text-sm text-[var(--color-text-muted)]">{subtitle}</p>
                  ) : null}
                  {completed && todayCompletion?.minimum ? (
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">Counted as the minimum.</p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {completed && onUncomplete ? (
                    <button
                      type="button"
                      onClick={() => requestUncomplete(habit)}
                      disabled={pendingSync}
                      className={cn(
                        "min-h-11 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-100 transition",
                        pendingSync ? "cursor-not-allowed opacity-60" : "hover:bg-amber-300/16",
                      )}
                    >
                      {pendingSync ? pendingLabel : "Undo"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onComplete(habit.id)}
                      disabled={pendingSync || completed || notDue}
                      title={
                        pendingSync
                          ? pendingLabel
                          : completed
                            ? CLEARED_TODAY_LABEL
                            : notDue
                              ? "Not due"
                              : "Done"
                      }
                      aria-label={
                        pendingSync
                          ? pendingLabel
                          : completed
                            ? `${habit.title} cleared`
                            : notDue
                              ? `${habit.title} is not due`
                              : `Mark ${habit.title} done`
                      }
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-full",
                        pendingSync || completed || notDue
                          ? "cursor-not-allowed border border-white/10 bg-white/5 text-[var(--color-text-muted)]"
                          : "hq-btn-accent text-slate-950 active:scale-[0.98]",
                      )}
                    >
                      <CheckIcon />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setMenuHabit(habit)}
                    disabled={pendingSync}
                    aria-haspopup="dialog"
                    title="Details"
                    aria-label={`View details for ${habit.title}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <InfoIcon />
                  </button>
                </div>
              </div>
              {!completed && tiny && onCompleteMinimum ? (
                <button
                  type="button"
                  onClick={() => onCompleteMinimum(habit.id)}
                  disabled={pendingSync || notDue}
                  className={cn(
                    "mt-3 min-h-11 w-full rounded-full border border-white/10 px-4 py-2 text-left text-sm text-[var(--color-text-muted)] transition",
                    pendingSync || notDue
                      ? "cursor-not-allowed opacity-60"
                      : "hover:border-white/20 hover:text-white",
                  )}
                >
                  Do minimum: {tiny}
                </button>
              ) : null}
              {completed && reflectionHabitId === habit.id && onReflect ? (
                <ReflectionPrompt
                  habit={habit}
                  onAnswer={(value) => onReflect(habit.id, value)}
                  onDismiss={() => onReflect(habit.id, "dismissed")}
                />
              ) : null}
            </motion.article>
          );
        })}
      </div>

      <HabitDetailDialog
        habit={menuHabit}
        habits={catalog}
        onClose={() => setMenuHabit(null)}
        onEdit={() => {
          if (!menuHabit) {
            return;
          }
          onEdit(menuHabit);
          setMenuHabit(null);
        }}
        onDelete={() => {
          setDeleteHabit(menuHabit);
          setMenuHabit(null);
        }}
      />

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

      <ConfirmDialog
        open={Boolean(undoWarn)}
        title="Undo this habit?"
        description={
          undoWarn
            ? `Undoing "${undoWarn.habit.title}" takes back ${formatNumber(undoWarn.clawback)} coin${undoWarn.clawback === 1 ? "" : "s"} you already spent. Your balance becomes ${formatNumber(undoWarn.coinsAfter)}. That's allowed — it stays there until you earn more. You keep anything you bought.`
            : undefined
        }
        onClose={() => setUndoWarn(null)}
      >
        <button
          type="button"
          onClick={() => setUndoWarn(null)}
          className="min-h-12 rounded-full border border-white/10 px-5 py-3 text-sm text-[var(--color-text-muted)] hover:text-white"
        >
          Keep it done
        </button>
        <button
          type="button"
          onClick={() => {
            if (!undoWarn || !onUncomplete) {
              return;
            }
            onUncomplete(undoWarn.habit.id);
            setUndoWarn(null);
          }}
          className="min-h-12 rounded-full hq-btn-accent px-5 py-3 text-sm font-semibold text-slate-950"
        >
          Undo
        </button>
      </ConfirmDialog>
    </>
  );
}

function detailValue(value: string) {
  const trimmed = value.trim();
  return trimmed || "Not set";
}

function HabitDetailDialog({
  habit,
  habits,
  onClose,
  onEdit,
  onDelete,
}: {
  habit: Habit | null;
  habits: Habit[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogA11y(panelRef, onClose);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const anchor = habit?.stackAfterHabitId
    ? habits.find((entry) => entry.id === habit.stackAfterHabitId)?.title
    : habit?.stackAfter;

  return createPortal(
    <AnimatePresence>
      {habit ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-md sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="habit-detail-title"
            tabIndex={-1}
            className="glass-panel flex max-h-[85vh] w-full max-w-md flex-col rounded-t-[1.5rem] border border-white/10 outline-none sm:rounded-[1.75rem]"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 px-5 pt-5">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Habit</p>
                <h2 id="habit-detail-title" className="section-title mt-2 truncate text-2xl text-white">
                  {habit.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                title="Close"
                aria-label="Close"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 text-[var(--color-text-muted)]"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="mt-5 grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 pb-4">
              <DetailRow label="After I" value={detailValue(anchor ?? "")} />
              <DetailRow label="I will" value={habit.title} />
              <DetailRow label="Time" value={detailValue(habit.cueTime ?? "")} />
              <DetailRow label="Where" value={detailValue(habit.cueContext)} />
              <DetailRow label="I'm someone who" value={detailValue(habit.identityWhy)} />
              <DetailRow label="I want to feel" value={detailValue(habit.desiredFeeling)} />
              <DetailRow label="On a hard day" value={detailValue(habit.tinyVersion)} />
              <DetailRow label="Notes" value={detailValue(habit.description)} />
              <DetailRow
                label="Difficulty"
                value={`${DIFFICULTY_LABELS[habit.difficulty]} · ${getDifficultyExp(habit.difficulty)} EXP`}
              />
              <DetailRow label="How often" value={describeRecurrence(habit)} />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-white/10 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={onEdit}
                title="Edit"
                aria-label={`Edit ${habit.title}`}
                className="flex h-11 w-11 items-center justify-center rounded-full hq-btn-accent text-slate-950"
              >
                <EditIcon />
              </button>
              <button
                type="button"
                onClick={onDelete}
                title="Delete"
                aria-label={`Delete ${habit.title}`}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-rose-300/25 text-rose-200"
              >
                <DeleteIcon />
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function ReflectionPrompt({
  habit,
  onAnswer,
  onDismiss,
}: {
  habit: Habit;
  onAnswer: (value: CompletionReflection) => void;
  onDismiss: () => void;
}) {
  const feeling = habit.desiredFeeling.trim();
  const options: Array<{ value: CompletionReflection; label: string }> = feeling
    ? [
        { value: "better", label: "Yes" },
        { value: "fine", label: "A little" },
        { value: "hard", label: "No" },
      ]
    : [
        { value: "better", label: "Better than expected" },
        { value: "fine", label: "Fine" },
        { value: "hard", label: "Hard" },
      ];

  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-white">
          {feeling ? `You wanted to feel ${feeling}. Did you?` : "How did that feel?"}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-sm text-[var(--color-text-muted)] hover:text-white"
        >
          Not now
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="How it felt">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onAnswer(option.value)}
            className="min-h-11 rounded-full border border-white/10 px-3 py-2 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const missing = value === "Not set";
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)]">{label}</p>
      <p className={cn("mt-1 break-words text-sm leading-6", missing ? "text-[var(--color-text-muted)]" : "text-white")}>
        {value}
      </p>
    </div>
  );
}

function InfoIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 11v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 8h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m6 12 4 4 8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 20h4l10-10-4-4L4 16v4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m12 6 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 7h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 7V5h6v2M8 7l1 12h6l1-12" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

