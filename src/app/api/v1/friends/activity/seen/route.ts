import { markActivitySeenAction } from "~/lib/v1/friends";
import { jsonFromOkResult } from "~/lib/v1/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return jsonFromOkResult(await markActivitySeenAction());
}
