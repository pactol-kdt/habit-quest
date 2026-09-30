import { markStreakNoticeSeenAction } from "~/lib/v1/friends";
import { asNonEmptyString, isRecord, jsonError, jsonFromOkResult, readJsonBody } from "~/lib/v1/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok || !isRecord(body.data)) {
    return jsonError("fromUserId is required.", 400);
  }
  const fromUserId = asNonEmptyString(body.data.fromUserId);
  const streak = body.data.streak;
  if (!fromUserId || typeof streak !== "number" || !Number.isInteger(streak)) {
    return jsonError("fromUserId and streak are required.", 400);
  }
  return jsonFromOkResult(await markStreakNoticeSeenAction(fromUserId, streak));
}
