/**
 * User-facing changelog. Newest release first.
 *
 * To add a release:
 * 1. Put a new entry at the top of CHANGELOG.
 * 2. Write what people can do now, in plain language.
 * 3. Only include changes that have already shipped.
 * A date is optional.
 */

export interface ChangelogEntry {
  version: string;
  date?: string;
  title: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.17.0",
    date: "October 2, 2026",
    title: "Small steps count",
    changes: [
      "You can finish a habit with its smallest version on a hard day. It still counts, with less of the usual reward.",
      "Today is less crowded, so your habits stay easier to focus on.",
      "Creating a habit starts with the name, schedule, and difficulty. Cues, stacking, and a tiny version are optional.",
      "New players choose which starter habits they want, or start with one of their own.",
      "HabitQuest may occasionally ask how a finish felt. You can skip it, and that skip stays skipped.",
      "Weekly reviews can point out a habit that may need a smaller version, a different cue, or a schedule change.",
      "When several rewards land together, they show as one short note.",
    ],
  },
  {
    version: "0.16.0",
    title: "Meet Kip",
    changes: [
      "Kip the pet stands on Today and offers one short cheer.",
      "Kip starts as an egg and changes form as you finish more habits. Undo today takes that finish off the count.",
      "Friends can see Kip's form. Your habit names stay hidden.",
    ],
  },
];

const SEEN_KEY = "habitquest:changelog-seen";

export const CHANGELOG_SEEN_EVENT = "habitquest:changelog-seen";

export function getLatestChangelogEntry() {
  return CHANGELOG[0] ?? null;
}

export function isChangelogUnseen(seenVersion: string | null) {
  const latest = getLatestChangelogEntry();
  return Boolean(latest && seenVersion !== latest.version);
}

export function readSeenChangelogVersion() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

export function markChangelogSeen(version: string) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(SEEN_KEY, version);
    window.dispatchEvent(new Event(CHANGELOG_SEEN_EVENT));
  } catch {
    // Private browsing can block storage. The page still works.
  }
}
