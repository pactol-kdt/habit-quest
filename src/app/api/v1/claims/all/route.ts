import { claimAllRewardsAction } from "~/lib/v1/claims";
import { jsonFromClaimResult } from "~/lib/v1/claim-http";
import { isRecord, jsonError, readJsonBody } from "~/lib/v1/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError("Invalid claim-all payload.", 400);
  }

  const kinds =
    body.data && isRecord(body.data) && Array.isArray(body.data.kinds)
      ? body.data.kinds.filter((kind): kind is string => typeof kind === "string")
      : undefined;

  return jsonFromClaimResult(await claimAllRewardsAction(kinds));
}
