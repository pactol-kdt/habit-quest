"use server";

import { and, desc, eq, gt, or, sql } from "drizzle-orm";
import { getCurrentUser } from "~/lib/auth/session";
import { ensureDatabase } from "~/lib/db";
import { userProgress, userSettings, users } from "~/lib/db/schema";

const LEADERBOARD_LIMIT = 50;

export type LevelLeaderboardEntry = {
  rank: number;
  userId: string;
  displayName: string;
  level: number;
  totalExp: number;
  currentStreak: number;
  bestStreak: number;
  isYou: boolean;
};

function resolveDisplayName(accountName: string | null | undefined, settingsName: string | null | undefined) {
  const account = accountName?.trim() ?? "";
  const settings = settingsName?.trim() ?? "";
  return account || settings || "Adventurer";
}

export async function getLevelLeaderboardAction() {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, error: "Sign in required." };
  }

  const database = await ensureDatabase();

  const rows = await database
    .select({
      userId: userProgress.userId,
      level: userProgress.level,
      totalExp: userProgress.totalExp,
      currentStreak: userProgress.currentStreak,
      bestStreak: userProgress.bestStreak,
      accountName: users.displayName,
      settingsName: userSettings.displayName,
    })
    .from(userProgress)
    .innerJoin(users, eq(userProgress.userId, users.id))
    .leftJoin(userSettings, eq(userProgress.userId, userSettings.userId))
    .orderBy(desc(userProgress.level), desc(userProgress.totalExp))
    .limit(LEADERBOARD_LIMIT);

  const entries: LevelLeaderboardEntry[] = rows.map((row, index) => ({
    rank: index + 1,
    userId: row.userId,
    displayName: resolveDisplayName(row.accountName, row.settingsName),
    level: row.level,
    totalExp: row.totalExp,
    currentStreak: row.currentStreak,
    bestStreak: row.bestStreak,
    isYou: row.userId === user.id,
  }));

  let you = entries.find((entry) => entry.isYou) ?? null;

  if (!you) {
    const [mine] = await database
      .select({
        userId: userProgress.userId,
        level: userProgress.level,
        totalExp: userProgress.totalExp,
        currentStreak: userProgress.currentStreak,
        bestStreak: userProgress.bestStreak,
        accountName: users.displayName,
        settingsName: userSettings.displayName,
      })
      .from(userProgress)
      .innerJoin(users, eq(userProgress.userId, users.id))
      .leftJoin(userSettings, eq(userProgress.userId, userSettings.userId))
      .where(eq(userProgress.userId, user.id))
      .limit(1);

    if (mine) {
      const [ahead] = await database
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(userProgress)
        .where(
          or(
            gt(userProgress.level, mine.level),
            and(
              eq(userProgress.level, mine.level),
              gt(userProgress.totalExp, mine.totalExp),
            ),
          ),
        );

      you = {
        rank: (ahead?.count ?? 0) + 1,
        userId: mine.userId,
        displayName: resolveDisplayName(mine.accountName, mine.settingsName),
        level: mine.level,
        totalExp: mine.totalExp,
        currentStreak: mine.currentStreak,
        bestStreak: mine.bestStreak,
        isYou: true,
      };
    }
  }

  const [totalRow] = await database
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(userProgress);

  return {
    ok: true as const,
    entries,
    you,
    totalPlayers: totalRow?.count ?? entries.length,
  };
}
