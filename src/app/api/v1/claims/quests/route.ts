import { claimQuestArcRewardAction } from "~/lib/v1/claims";
import { jsonFromClaimResult } from "~/lib/v1/claim-http";
import { asNonEmptyString, isRecord, jsonError, readJsonBody } from "~/lib/v1/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok || !isRecord(body.data)) {
    return jsonError("arcId is required.", 400);
  }
  const arcId = asNonEmptyString(body.data.arcId);
  if (!arcId) {
    return jsonError("arcId is required.", 400);
  }
  return jsonFromClaimResult(await claimQuestArcRewardAction(arcId));
}
