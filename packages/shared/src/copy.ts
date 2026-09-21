import type { UserProgress } from "./types";

export type MotivationalCopy = {
  headline: string;
  support: string;
};

function timeOfDayHeadline(hour = new Date().getHours()) {
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 17) {
    return "Keep the pace";
  }
  if (hour < 21) {
    return "Close strong";
  }
  return "One more clear";
}

/**
 * Short, inclusive home copy — works for first-day players and streak veterans.
 * RPG flavor stays light; the line should feel like a product, not a monologue.
 */
export function getMotivationalGreeting(progress: UserProgress): MotivationalCopy {
  const headline = timeOfDayHeadline();
  const streak = progress.currentStreak;

  if (streak >= 30) {
    return {
      headline,
      support: `Day ${streak}. Rare consistency — protect the streak.`,
    };
  }

  if (streak >= 14) {
    return {
      headline,
      support: `Day ${streak}. You're in the rhythm. Stack today's wins.`,
    };
  }

  if (streak >= 7) {
    return {
      headline,
      support: `Day ${streak}. The chain is warm — keep it going.`,
    };
  }

  if (streak >= 3) {
    return {
      headline,
      support: "Momentum is building. One clear at a time.",
    };
  }

  if (streak >= 1) {
    return {
      headline,
      support: "Nice start. Come back tomorrow and the streak grows.",
    };
  }

  if (progress.level >= 5) {
    return {
      headline,
      support: "You're leveled up — make today count with a clear.",
    };
  }

  return {
    headline,
    support: "Clear what you can. One habit is a full win.",
  };
}

/** Concise page heroes — catchy, not lore-dump. */
export const PAGE_HEROES = {
  habits: {
    eyebrow: "Habits",
    title: "All habits",
    support: "Stack a cue. Finish the loop. Build your run.",
  },
  shop: {
    eyebrow: "Shop",
    title: "Cosmetics",
    support:
      "Spend coins on titles, frames, avatars, and themes. Buyable tiers unlock in order — own the previous one first.",
  },
  leaderboard: {
    eyebrow: "Streaks",
    title: "Streak board",
    support: "Climb by streak. See how your consistency stacks up.",
  },
  boss: {
    eyebrow: "Week",
    title: "Weekly challenge",
    support:
      "Each habit fills this week's bar. A 15-clear contract sits on the same page.",
  },
  season: {
    eyebrow: "Season",
    title: "Season rewards",
    support:
      "Earn season XP, climb the track, and claim gifts. The monthly climb and quest chapters live here too.",
  },
  achievements: {
    eyebrow: "Milestones",
    title: "Achievements",
    support: "Milestones unlocked as you build the habit.",
  },
  guides: {
    eyebrow: "Guide",
    title: "How it works",
    support: "Short answers for stacking, streaks, weekly goals, and rewards.",
  },
  profile: {
    eyebrow: "Profile",
    title: "Your profile",
    support: "Activity, identity, honors, and account.",
  },
  settings: {
    eyebrow: "Settings",
    title: "Your setup",
    support: "Reminders and app details.",
  },
} as const;

/** First-run / replayable how-to. Keep each lesson one job. */
export const TUTORIAL_LESSONS = [
  {
    id: "stack",
    eyebrow: "Stack",
    title: "Hook it onto a cue",
    body: "Habits stick when they follow something you already do. Write the automatic moment, then the new action.",
    points: [
      "After I pour coffee, I will stretch.",
      "You can also chain After habit 1 → habit 2.",
    ],
  },
  {
    id: "clear",
    eyebrow: "Done",
    title: "Tap to finish today",
    body: "Home is today's due list. Tap a habit when you're done. Miss-tap? Undo anytime today.",
    points: ["Habits is the full roster — stack, edit, and browse there.", "One finish is a full win."],
  },
  {
    id: "lockin",
    eyebrow: "Today",
    title: "Rewards land now",
    body: "A Done grants EXP, season XP, and weekly-bar progress immediately. Undo anytime today if you tapped by mistake. Opening tomorrow still catches up days you missed.",
    points: [
      "Streak counts as soon as you finish.",
      "Spendable coins in the nav are already yours.",
    ],
  },
  {
    id: "loop",
    eyebrow: "Daily loop",
    title: "Then do it again tomorrow",
    body: "Finish what's due. Keep the streak with at least one finish a day. Spend coins in Shop. Guides has the full rulebook.",
    points: ["Week, Season, and Shop live in the map when you want them.", "Replay this anytime from Habits."],
  },
] as const;
