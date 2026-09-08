"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { TUTORIAL_LESSONS } from "~/lib/habitquest/copy";
import { cn } from "~/lib/ui/cn";

type TutorialMode = "onboarding" | "replay";

interface TutorialModalProps {
  open: boolean;
  mode: TutorialMode;
  hasHabits: boolean;
  initialName?: string;
  onSkip: (displayName: string) => void;
  onFinish: (displayName: string, createHabit: boolean) => void;
}

export function TutorialModal({
  open,
  mode,
  hasHabits,
  initialName = "",
  onSkip,
  onFinish,
}: TutorialModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-md sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <TutorialDialog
            key={mode}
            mode={mode}
            hasHabits={hasHabits}
            initialName={initialName}
            onSkip={onSkip}
            onFinish={onFinish}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function TutorialDialog({
  mode,
  hasHabits,
  initialName,
  onSkip,
  onFinish,
}: Omit<TutorialModalProps, "open">) {
  const includeName = mode === "onboarding";
  const totalSteps = TUTORIAL_LESSONS.length + (includeName ? 1 : 0);
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState(initialName);

  const isNameStep = includeName && step === 0;
  const lessonIndex = includeName ? step - 1 : step;
  const lesson = isNameStep ? null : TUTORIAL_LESSONS[lessonIndex];
  const isLast = step === totalSteps - 1;
  const resolvedName = displayName.trim() || "Adventurer";
  const showCreateHabit = mode === "onboarding" || !hasHabits;

  function goNext() {
    if (isLast) {
      onFinish(resolvedName, showCreateHabit);
      return;
    }
    setStep((current) => Math.min(current + 1, totalSteps - 1));
  }

  function goBack() {
    setStep((current) => Math.max(current - 1, 0));
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
      className="glass-panel flex max-h-[min(92dvh,900px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.5rem] border border-white/10 sm:rounded-[2rem]"
      initial={{ y: 18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 12, opacity: 0 }}
    >
      <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4 md:px-8 md:pt-7">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">
            {isNameStep ? "Welcome" : "How to play"}
          </p>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            {step + 1} of {totalSteps}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSkip(resolvedName)}
          className="min-h-10 shrink-0 rounded-full border border-white/10 px-3 py-1 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
        >
          {mode === "onboarding" ? "Skip" : "Close"}
        </button>
      </div>

      <div className="flex gap-1.5 px-5 pt-4 md:px-8">
        {Array.from({ length: totalSteps }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full transition",
              index <= step ? "hq-fill-accent" : "bg-white/10",
            )}
          />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 md:px-8 md:py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18 }}
          >
            {isNameStep ? (
              <NameStep displayName={displayName} onChange={setDisplayName} />
            ) : lesson ? (
              <LessonStep lesson={lesson} />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="grid gap-2 border-t border-white/10 bg-slate-950/40 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex sm:justify-end md:px-8">
        {step > 0 ? (
          <button
            type="button"
            onClick={goBack}
            className="min-h-12 rounded-full border border-white/10 px-5 py-3 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
          >
            Back
          </button>
        ) : null}
        {isLast && showCreateHabit ? (
          <>
            <button
              type="button"
              onClick={() => onFinish(resolvedName, false)}
              className="min-h-12 rounded-full border border-white/10 px-5 py-3 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
            >
              I&apos;ll add a habit later
            </button>
            <button
              type="button"
              onClick={() => onFinish(resolvedName, true)}
              className="min-h-12 rounded-full hq-btn-accent px-5 py-3 text-sm font-semibold text-slate-950"
            >
              Stack first habit
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={goNext}
            className="min-h-12 rounded-full hq-btn-accent px-5 py-3 text-sm font-semibold text-slate-950"
          >
            {isLast ? "Got it" : isNameStep ? "Show me how" : "Next"}
          </button>
        )}
      </div>
    </motion.div>
  );
}

function NameStep({
  displayName,
  onChange,
}: {
  displayName: string;
  onChange: (value: string) => void;
}) {
  return (
    <>
      <h2 id="tutorial-title" className="section-title text-2xl text-white sm:text-3xl">
        Welcome to HabitQuest
      </h2>
      <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
        Stack a habit onto something you already do, clear it each day, and keep the streak.
        The next screens show the loop — it takes about a minute.
      </p>
      <label className="mt-6 grid gap-2">
        <span className="text-sm text-[var(--color-text-muted)]">Display name</span>
        <input
          value={displayName}
          onChange={(event) => onChange(event.target.value)}
          maxLength={32}
          placeholder="Adventurer"
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-cyan-300/50"
          autoFocus
        />
      </label>
    </>
  );
}

function LessonStep({ lesson }: { lesson: (typeof TUTORIAL_LESSONS)[number] }) {
  return (
    <>
      <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">{lesson.eyebrow}</p>
      <h2 id="tutorial-title" className="section-title mt-2 text-2xl text-white sm:text-3xl">
        {lesson.title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{lesson.body}</p>
      <LessonVisual lessonId={lesson.id} />
      <ul className="mt-4 space-y-2 text-sm leading-6 text-[var(--color-text-muted)]">
        {lesson.points.map((point) => (
          <li key={point} className="flex gap-2">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function LessonVisual({ lessonId }: { lessonId: (typeof TUTORIAL_LESSONS)[number]["id"] }) {
  if (lessonId === "stack") {
    return (
      <div className="mt-5 rounded-[1.25rem] border border-cyan-300/20 bg-cyan-300/8 p-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/80">Your formula</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-cyan-300/15 px-3 py-1.5 text-sm text-cyan-50">
            pour coffee
          </span>
          <span aria-hidden className="text-cyan-200/70">
            →
          </span>
          <span className="rounded-full bg-cyan-300/15 px-3 py-1.5 text-sm text-cyan-50">
            stretch 5 min
          </span>
        </div>
        <p className="mt-3 text-sm text-cyan-100">After I pour coffee, I will stretch.</p>
      </div>
    );
  }

  if (lessonId === "clear") {
    return (
      <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">Stretch for 5 minutes</p>
            <p className="mt-1 text-xs text-cyan-100/80">After pour coffee, I will stretch</p>
          </div>
          <span className="shrink-0 rounded-full hq-btn-accent px-3 py-1.5 text-xs font-semibold text-slate-950">
            Clear
          </span>
        </div>
      </div>
    );
  }

  if (lessonId === "lockin") {
    return (
      <div className="mt-5 grid grid-cols-2 gap-2">
        <div className="rounded-[1.15rem] border border-cyan-300/20 bg-cyan-300/8 p-3">
          <p className="text-xs text-[var(--color-text-muted)]">Preview EXP</p>
          <p className="mt-1 text-xl font-semibold text-cyan-100">25</p>
          <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">Banks tonight</p>
        </div>
        <div className="rounded-[1.15rem] border border-white/10 bg-white/5 p-3">
          <p className="text-xs text-[var(--color-text-muted)]">Spendable</p>
          <p className="mt-1 text-xl font-semibold text-amber-100">1 coin</p>
          <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">Yours now</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 grid gap-2">
      {[
        ["Home", "Today's due list"],
        ["Habits", "Stack, edit, replay how-to"],
        ["Shop", "Spend coins on cosmetics"],
        ["More → Guides", "Full rulebook"],
      ].map(([label, hint]) => (
        <div
          key={label}
          className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5"
        >
          <span className="text-sm text-white">{label}</span>
          <span className="text-xs text-[var(--color-text-muted)]">{hint}</span>
        </div>
      ))}
    </div>
  );
}
