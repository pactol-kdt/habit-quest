import { getIncomingNudgesAction } from "~/lib/v1/friends";
import { jsonFromOkResult } from "~/lib/v1/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return jsonFromOkResult(await getIncomingNudgesAction());
}
