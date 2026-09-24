"use client";

import { useEffect, useState } from "react";
import { getIncomingNudgesRequest, markNudgeSeenRequest } from "~/lib/v1/requests";
import { useHabitQuestStore } from "~/store/habitquest-store";

type IncomingNudge = {
  fromUserId: string;
  title: string;
  body: string;
};

export function FriendNudgeBanner() {
  const authUserId = useHabitQuestStore((state) => state.authUser?.id ?? null);
  const [nudge, setNudge] = useState<IncomingNudge | null>(null);

  useEffect(() => {
    if (!authUserId) {
      setNudge(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void getIncomingNudgesRequest().then((result) => {
        if (cancelled || !result.ok) {
          return;
        }
        setNudge(result.nudges[0] ?? null);
      });
    }, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [authUserId]);

  if (!nudge) {
    return null;
  }

  return (
    <div className="mb-4 rounded-3xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3">
      <p className="font-semibold text-white">{nudge.title}</p>
      <p className="mt-1 text-sm text-cyan-50/90">{nudge.body}</p>
      <button
        type="button"
        onClick={() => {
          const current = nudge;
          setNudge(null);
          void markNudgeSeenRequest(current.fromUserId);
        }}
        className="mt-3 rounded-full border border-white/10 px-4 py-2 text-sm text-white"
      >
        Got it
      </button>
    </div>
  );
}
