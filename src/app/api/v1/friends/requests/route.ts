import { sendFriendRequestAction } from "~/lib/v1/friends";
import { asNonEmptyString, isRecord, jsonError, jsonFromOkResult, readJsonBody } from "~/lib/v1/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError(body.error, 400);
  }
  if (!isRecord(body.data)) {
    return jsonError("UID is required.", 400);
  }

  const uid = asNonEmptyString(body.data.uid);
  if (!uid) {
    return jsonError("UID is required.", 400);
  }

  return jsonFromOkResult(await sendFriendRequestAction(uid));
}
