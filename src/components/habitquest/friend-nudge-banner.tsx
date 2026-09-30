"use client";

import { useEffect, useState } from "react";
import { whenFriendsRequestSettles } from "~/hooks/use-incoming-friend-requests";
import {
  cheerFriendRequest,
  getFriendInboxRequest,
  markAcceptNoticeSeenRequest,
  markCheerNoticeSeenRequest,
  markStreakNoticeSeenRequest,
  markFinishNoticeSeenRequest,
  markFriendRequestAlertSeenRequest,
  markNudgeSeenRequest,
} from "~/lib/v1/requests";
import { useHabitQuestStore } from "~/store/habitquest-store";

type IncomingNotice = {
  fromUserId: string;
  title: string;
  body: string;
};

type StreakNotice = IncomingNotice & { streak: number };

export function FriendNudgeBanner() {
  const authUserId = useHabitQuestStore((state) => state.authUser?.id ?? null);
  const [nudge, setNudge] = useState<IncomingNotice | null>(null);
  const [requestAlert, setRequestAlert] = useState<IncomingNotice | null>(null);
  const [finishNotice, setFinishNotice] = useState<IncomingNotice | null>(null);
  const [acceptNotice, setAcceptNotice] = useState<IncomingNotice | null>(null);
  const [streakNotice, setStreakNotice] = useState<StreakNotice | null>(null);
  const [cheerNotice, setCheerNotice] = useState<IncomingNotice | null>(null);
  const [cheeredIds, setCheeredIds] = useState<string[]>([]);

  useEffect(() => {
    if (!authUserId) {
      setNudge(null);
      setRequestAlert(null);
      setFinishNotice(null);
      setAcceptNotice(null);
      setStreakNotice(null);
      setCheerNotice(null);
      setCheeredIds([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void whenFriendsRequestSettles().then(() => {
        if (cancelled) {
          return null;
        }
        return getFriendInboxRequest();
      }).then((result) => {
        if (cancelled || !result?.ok) {
          return;
        }
        setNudge(result.nudge);
        setRequestAlert(result.request);
        setAcceptNotice(result.accept);
        setStreakNotice(result.streak);
        setFinishNotice(result.finish);
        setCheerNotice(result.cheer);
      });
    }, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [authUserId]);

  if (!nudge && !requestAlert && !finishNotice && !acceptNotice && !streakNotice && !cheerNotice) {
    return null;
  }

  return (
    <div className="mb-4 grid gap-3">
      {requestAlert ? (
        <div className="rounded-3xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3">
          <p className="font-semibold text-white">{requestAlert.title}</p>
          <p className="mt-1 text-sm text-cyan-50/90">{requestAlert.body}</p>
          <button
            type="button"
            onClick={() => {
              const current = requestAlert;
              setRequestAlert(null);
              void markFriendRequestAlertSeenRequest(current.fromUserId);
            }}
            className="mt-3 rounded-full border border-white/10 px-4 py-2 text-sm text-white"
          >
            Got it
          </button>
        </div>
      ) : null}
      {acceptNotice ? (
        <div className="rounded-3xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3">
          <p className="font-semibold text-white">{acceptNotice.title}</p>
          <p className="mt-1 text-sm text-cyan-50/90">{acceptNotice.body}</p>
          <button
            type="button"
            onClick={() => {
              const current = acceptNotice;
              setAcceptNotice(null);
              void markAcceptNoticeSeenRequest(current.fromUserId);
            }}
            className="mt-3 rounded-full border border-white/10 px-4 py-2 text-sm text-white"
          >
            Got it
          </button>
        </div>
      ) : null}
      {streakNotice ? (
        <div className="rounded-3xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3">
          <p className="font-semibold text-white">{streakNotice.title}</p>
          <p className="mt-1 text-sm text-cyan-50/90">{streakNotice.body}</p>
          <button
            type="button"
            onClick={() => {
              const current = streakNotice;
              setStreakNotice(null);
              void markStreakNoticeSeenRequest(current.fromUserId, current.streak);
            }}
            className="mt-3 rounded-full border border-white/10 px-4 py-2 text-sm text-white"
          >
            Got it
          </button>
        </div>
      ) : null}
      {finishNotice ? (
        <div className="rounded-3xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3">
          <p className="font-semibold text-white">{finishNotice.title}</p>
          <p className="mt-1 text-sm text-cyan-50/90">{finishNotice.body}</p>
          <div className="mt-3 flex items-center gap-2">
            {cheeredIds.includes(finishNotice.fromUserId) ? (
              <span
                title="Cheered"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-cyan-100"
              >
                <CheerIcon filled />
              </span>
            ) : (
              <button
                type="button"
                aria-label="Cheer"
                title="Cheer"
                onClick={() => {
                  const current = finishNotice;
                  void cheerFriendRequest(current.fromUserId).then((result) => {
                    if (result.ok || result.error === "You already cheered them today.") {
                      setCheeredIds((ids) =>
                        ids.includes(current.fromUserId) ? ids : [...ids, current.fromUserId],
                      );
                    }
                  });
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-300 text-slate-950"
              >
                <CheerIcon />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const current = finishNotice;
                setFinishNotice(null);
                void markFinishNoticeSeenRequest(current.fromUserId);
              }}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-white"
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}
      {cheerNotice ? (
        <div className="rounded-3xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3">
          <p className="font-semibold text-white">{cheerNotice.title}</p>
          <p className="mt-1 text-sm text-cyan-50/90">{cheerNotice.body}</p>
          <button
            type="button"
            onClick={() => {
              const current = cheerNotice;
              setCheerNotice(null);
              void markCheerNoticeSeenRequest(current.fromUserId);
            }}
            className="mt-3 rounded-full border border-white/10 px-4 py-2 text-sm text-white"
          >
            Got it
          </button>
        </div>
      ) : null}
      {nudge ? (
        <div className="rounded-3xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3">
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
      ) : null}
    </div>
  );
}

function CheerIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} aria-hidden>
      <path
        d="m12 3 2.2 6.6H21l-5.4 4 2.1 6.6L12 16.8 6.3 20.2 8.4 13.6 3 9.6h6.8L12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
