"use client";

import { useEffect, useRef } from "react";
import { GlassCard } from "~/components/habitquest/glass-card";
import { PulseOnChange } from "~/components/habitquest/pulse-on-change";
import { getPetProgress, PET_NAME, petCountLabel, type PetStageId } from "~/lib/habitquest/pet";
import { cn } from "~/lib/ui/cn";

export type PetMood = "cheer" | "proud" | "rest";

export function PetCard({ completions }: { completions: number }) {
  const progress = getPetProgress(completions);
  const countLabel = progress.stage.id === "egg" ? "Finish a habit to hatch it." : petCountLabel(completions);

  return (
    <GlassCard className="rounded-[1.75rem]">
      <div className="flex items-center gap-4">
        <PetPortrait stage={progress.stage.id} completions={completions} className="h-20 w-28 sm:h-24 sm:w-32" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-white">{PET_NAME}</p>
          <p className="mt-1 text-sm text-white/90">{progress.stage.label}</p>
          <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
            <PulseOnChange value={completions}>
              <span className="tabular-nums">{countLabel}</span>
            </PulseOnChange>
          </p>
        </div>
      </div>
    </GlassCard>
  );
}

export function PetPortrait({
  stage,
  completions = 0,
  mood = "cheer",
  className,
}: {
  stage: PetStageId;
  completions?: number;
  mood?: PetMood;
  className?: string;
}) {
  const drawing = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const motions = drawing.current?.querySelectorAll("animate, animateTransform");
    motions?.forEach((motion) => {
      if (motion instanceof SVGAnimateElement) {
        motion.beginElement();
      }
    });
  }, [stage, mood, completions]);

  return (
    <div className={cn("relative flex shrink-0 items-end justify-center", className)} aria-hidden>
      <svg ref={drawing} viewBox="0 0 168 128" className="h-full w-full overflow-visible">
        <PetBody stage={stage} mood={mood} />
      </svg>
    </div>
  );
}

const INK = "#102033";
const STROKE = 4;

function PetBody({ stage, mood }: { stage: PetStageId; mood: PetMood }) {
  const gold = stage === "elder";
  const body = gold ? "#f5c15d" : "#5eead4";
  const belly = gold ? "#fff4cc" : "#ecfeff";

  if (stage === "egg") {
    return (
      <>
        <ellipse cx="84" cy="108" rx="28" ry="6" fill="#000" opacity="0.28" />
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="-12 78 108; 12 78 108; -12 78 108"
            dur="1.1s"
            repeatCount="indefinite"
          />
          <ellipse cx="78" cy="72" rx="26" ry="32" fill="#f4efe6" stroke={INK} strokeWidth={STROKE} />
          <path d="M62 58c6 10 16 12 24 4" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="68" cy="64" rx="6" ry="10" fill="#fff" opacity="0.55" />
        </g>
      </>
    );
  }

  const showTail = stage !== "hatchling";
  const showMark = stage === "keeper" || stage === "warden" || stage === "elder";
  const tallTuft = stage === "warden" || stage === "elder";

  const hop = mood === "proud" ? "0 8; 0 -26; 0 8" : mood === "rest" ? "0 0; 0 -14; 0 0" : "0 4; 0 -20; 0 4";
  const hopDur = mood === "proud" ? "0.65s" : mood === "rest" ? "2s" : "1.05s";

  return (
    <>
      <ellipse cx="84" cy="114" rx="36" ry="6" fill="#000" opacity="0.28" />
      <g>
        <animateTransform attributeName="transform" type="translate" values={hop} dur={hopDur} repeatCount="indefinite" />
        {gold ? (
          <>
            <g>
              <animateTransform attributeName="transform" type="rotate" values="0 48 72; -18 48 72; 0 48 72" dur="0.55s" repeatCount="indefinite" />
              <path d="M46 70c-16-4-22-22-10-30 8 8 14 16 16 26" fill="#f8d56b" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
            </g>
            <g>
              <animateTransform attributeName="transform" type="rotate" values="0 116 70; 18 116 70; 0 116 70" dur="0.55s" repeatCount="indefinite" />
              <path d="M118 68c16-6 24-20 12-30-10 8-16 16-18 26" fill="#f8d56b" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
            </g>
          </>
        ) : null}
        {showTail ? (
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              values="0 112 98; 32 112 98; -18 112 98; 0 112 98"
              dur="0.8s"
              repeatCount="indefinite"
            />
            <path
              d="M112 96c18 2 28-8 24-20-3 10-12 14-22 12"
              fill={body}
              stroke={INK}
              strokeWidth={STROKE}
              strokeLinejoin="round"
            />
          </g>
        ) : null}
        <path
          d="M48 58c-6 8-10 22-8 40 2 16 16 22 34 22h28c20 0 34-10 34-28 0-16-8-28-20-34-4-14-16-24-28-22-8 1-14 6-18 12-8 2-16 4-22 10Z"
          fill={body}
          stroke={INK}
          strokeWidth={STROKE}
          strokeLinejoin="round"
        />
        <path
          d="M78 28c2-16 14-22 18-8 2 8-2 16-8 18"
          fill={body}
          stroke={INK}
          strokeWidth={STROKE}
          strokeLinejoin="round"
        />
        {tallTuft ? (
          <path
            d="M96 24c8-18 22-16 16 2-4 8-12 10-16 6"
            fill={gold ? "#fff4cc" : "#99f6e4"}
            stroke={INK}
            strokeWidth="3"
            strokeLinejoin="round"
          />
        ) : null}
        <path d="M70 92c6 14 28 14 34 0 2 10-6 18-17 18s-19-8-17-18Z" fill={belly} />
        {showMark ? <circle cx="86" cy="88" r="4" fill="none" stroke={INK} strokeWidth="2.5" /> : null}
        <PetFace mood={mood} />
      </g>
    </>
  );
}

function PetFace({ mood }: { mood: PetMood }) {
  if (mood === "proud") {
    return (
      <>
        <path d="M58 70c4-8 12-8 16 0" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M90 70c4-8 12-8 16 0" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M72 80c6 10 20 10 26 0" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      </>
    );
  }

  if (mood === "rest") {
    return (
      <>
        <path d="M60 70h12" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M92 70h12" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M76 82c4 4 12 4 16 0" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      </>
    );
  }

  return (
    <>
      <BlinkEye cx={66} />
      <BlinkEye cx={100} />
      <path d="M76 80c5 6 14 6 19 0" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function BlinkEye({ cx }: { cx: number }) {
  return (
    <g>
      <ellipse cx={cx} cy={68} rx={5} ry={5} fill={INK}>
        <animate attributeName="ry" values="5;5;0.4;5" keyTimes="0;0.82;0.9;1" dur="2.2s" repeatCount="indefinite" />
      </ellipse>
      <circle cx={cx + 2} cy={66} r={1.6} fill="#fff">
        <animate attributeName="opacity" values="1;1;0;1" keyTimes="0;0.82;0.9;1" dur="2.2s" repeatCount="indefinite" />
      </circle>
    </g>
  );
}
