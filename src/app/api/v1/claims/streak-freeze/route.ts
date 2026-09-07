import { buyStreakFreezeAction } from "~/lib/v1/claims";
import { jsonFromClaimResult } from "~/lib/v1/claim-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return jsonFromClaimResult(await buyStreakFreezeAction());
}
