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
    support: "Stack triggers. Clear loops. Build your run.",
  },
  shop: {
    eyebrow: "Shop",
    title: "Cosmetics",
    support:
      "Spend coins on titles, frames, avatars, and themes. Buyable tiers unlock in order — own the previous one first.",
  },
  leaderboard: {
    eyebrow: "Arena",
    title: "Streak board",
    support: "Climb by streak. Show the world your consistency.",
  },
  boss: {
    eyebrow: "Raid",
    title: "Weekly boss",
    support: "Every clear deals damage. Drop the HP bar this week.",
  },
  season: {
    eyebrow: "Season",
    title: "Season pass",
    support: "Climb to level 30 on season XP, then claim the finale to clear the month.",
  },
  achievements: {
    eyebrow: "Trophies",
    title: "Achievements",
    support: "Milestones unlocked on your journey.",
  },
  guides: {
    eyebrow: "Guide",
    title: "How it works",
    support: "Short answers for stacking, streaks, bosses, and rewards.",
  },
  profile: {
    eyebrow: "Profile",
    title: "Your legend",
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
    eyebrow: "Clear",
    title: "Tap to clear today",
    body: "Home is today's due list. Tap a habit to clear it. Miss-tap? Undo anytime until the day locks in.",
    points: ["Habits is the full roster — stack, edit, and browse there.", "One clear is a full win."],
  },
  {
    id: "lockin",
    eyebrow: "Lock-in",
    title: "Preview until midnight",
    body: "The clear is remembered now. EXP, season XP, combo coins, and boss damage stay in Preview until midnight on next open — so undos stay safe.",
    points: [
      "Streak counts as soon as you clear.",
      "Spendable coins in the nav are already yours.",
    ],
  },
  {
    id: "loop",
    eyebrow: "Daily loop",
    title: "Then do it again tomorrow",
    body: "Clear what's due. Keep the streak with at least one clear a day. Spend coins in Shop. Guides has the full rulebook.",
    points: ["Boss, season, and achievements unlock as you level.", "Replay this anytime from Habits."],
  },
] as const;
