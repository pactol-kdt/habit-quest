import { getLevelLeaderboardAction } from "~/lib/v1/leaderboard";
import { jsonFromOkResult } from "~/lib/v1/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return jsonFromOkResult(await getLevelLeaderboardAction());
}
