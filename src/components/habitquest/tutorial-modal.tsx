"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TUTORIAL_LESSONS } from "~/lib/habitquest/copy";
import { cn } from "~/lib/ui/cn";

type TutorialMode = "onboarding" | "replay";

interface TutorialModalProps {
  open: boolean;
  mode: TutorialMode;
  hasHabits: boolean;
  initialName?: string;
  onFinish: (displayName: string, createHabit: boolean) => void;
}

export function TutorialModal({
  open,
  mode,
  hasHabits,
  initialName = "",
  onFinish,
}: TutorialModalProps) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <TutorialPages
          key={mode}
          mode={mode}
          hasHabits={hasHabits}
          initialName={initialName}
          onFinish={onFinish}
        />
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function TutorialPages({
  mode,
  hasHabits,
  initialName = "",
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

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const nameMissing = isNameStep && displayName.trim().length === 0;

  function goNext() {
    if (nameMissing) {
      return;
    }
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
      className="fixed inset-0 z-[90] flex flex-col bg-[var(--color-bg)] text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <header className="px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">
          {isNameStep ? "Welcome" : "How to play"}
        </p>
      </header>

      <div className="flex flex-1 items-center overflow-hidden px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="mx-auto w-full max-w-md"
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.22 }}
          >
            {isNameStep ? (
              <NameStep displayName={displayName} onChange={setDisplayName} />
            ) : lesson ? (
              <LessonStep lesson={lesson} />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex w-full max-w-md flex-col gap-5">
          <div className="flex justify-center gap-2" aria-hidden>
            {Array.from({ length: totalSteps }, (_, index) => (
              <span
                key={index}
                className={cn(
                  "h-2 rounded-full transition",
                  index === step ? "w-6 hq-fill-accent" : "w-2 bg-white/20",
                )}
              />
            ))}
          </div>
          <div className="grid gap-2">
            {isLast && showCreateHabit ? (
              <>
                <button
                  type="button"
                  onClick={() => onFinish(resolvedName, true)}
                  className="min-h-12 w-full rounded-full hq-btn-accent px-5 py-3 text-sm font-semibold text-slate-950"
                >
                  Stack first habit
                </button>
                <button
                  type="button"
                  onClick={() => onFinish(resolvedName, false)}
                  className="min-h-11 w-full rounded-full px-5 py-3 text-sm text-[var(--color-text-muted)] transition hover:text-white"
                >
                  I&apos;ll add a habit later
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={goNext}
                disabled={nameMissing}
                className="min-h-12 w-full rounded-full hq-btn-accent px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-40"
              >
                {isLast ? "Got it" : isNameStep ? "Show me how" : "Next"}
              </button>
            )}
            {step > 0 ? (
              <button
                type="button"
                onClick={goBack}
                className="min-h-11 w-full rounded-full px-5 py-2 text-sm text-[var(--color-text-muted)] transition hover:text-white"
              >
                Back
              </button>
            ) : null}
          </div>
        </div>
      </footer>
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
    <div className="text-center">
      <img
        src="/brand/habitquest-logo.png"
        alt=""
        className="mx-auto h-16 w-16 rounded-2xl border border-white/10 object-cover"
      />
      <h1 className="section-title mt-6 text-3xl text-white sm:text-4xl">Welcome to HabitQuest</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
        Stack a habit onto something you already do, clear it each day, and keep the streak.
      </p>
      <label className="mt-8 grid gap-2 text-left">
        <span className="text-sm text-[var(--color-text-muted)]">Display name</span>
        <input
          value={displayName}
          onChange={(event) => onChange(event.target.value)}
          maxLength={32}
          required
          placeholder="Your name"
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-cyan-300/50"
          autoFocus
        />
        <span className="text-xs text-[var(--color-text-muted)]">Required before the tutorial.</span>
      </label>
    </div>
  );
}

function LessonStep({ lesson }: { lesson: (typeof TUTORIAL_LESSONS)[number] }) {
  return (
    <div className="text-center">
      <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">{lesson.eyebrow}</p>
      <h1 className="section-title mt-3 text-3xl text-white sm:text-4xl">{lesson.title}</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{lesson.body}</p>
      <LessonVisual lessonId={lesson.id} />
      <ul className="mt-5 space-y-2 text-left text-sm leading-6 text-[var(--color-text-muted)]">
        {lesson.points.map((point) => (
          <li key={point} className="flex gap-2">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LessonVisual({ lessonId }: { lessonId: (typeof TUTORIAL_LESSONS)[number]["id"] }) {
  if (lessonId === "stack") {
    return (
      <div className="mt-8 rounded-[1.25rem] border border-cyan-300/20 bg-cyan-300/8 p-4 text-left">
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
      <div className="mt-8 rounded-[1.25rem] border border-white/10 bg-white/5 p-4 text-left">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">Stretch for 5 minutes</p>
            <p className="mt-1 text-xs text-cyan-100/80">After pour coffee, I will stretch</p>
          </div>
          <span className="shrink-0 rounded-full hq-btn-accent px-3 py-1.5 text-xs font-semibold text-slate-950">
            Done
          </span>
        </div>
      </div>
    );
  }

  if (lessonId === "lockin") {
    return (
      <div className="mt-8 grid grid-cols-2 gap-2 text-left">
        <div className="rounded-[1.15rem] border border-cyan-300/20 bg-cyan-300/8 p-3">
          <p className="text-xs text-[var(--color-text-muted)]">Level</p>
          <p className="mt-1 text-xl font-semibold text-cyan-100">25</p>
          <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">Yours now</p>
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
    <div className="mt-8 grid gap-2 text-left">
      {[
        ["Home", "Today's due list"],
        ["Habits", "Stack, edit, replay how-to"],
        ["Shop", "Spend coins on cosmetics"],
        ["You → Guides", "Full rulebook"],
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
