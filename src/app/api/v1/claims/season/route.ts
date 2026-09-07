import { claimSeasonPassLevelAction } from "~/lib/v1/claims";
import { jsonFromClaimResult } from "~/lib/v1/claim-http";
import { isRecord, jsonError, readJsonBody } from "~/lib/v1/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok || !isRecord(body.data) || typeof body.data.level !== "number") {
    return jsonError("Invalid season level.", 400);
  }
  return jsonFromClaimResult(await claimSeasonPassLevelAction(body.data.level));
}
