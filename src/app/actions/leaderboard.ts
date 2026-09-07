"use server";

import { getLevelLeaderboardAction as getLevelLeaderboard } from "~/lib/v1/leaderboard";

export type { LevelLeaderboardEntry } from "~/lib/v1/leaderboard";

export async function getLevelLeaderboardAction() {
  return getLevelLeaderboard();
}
