import { lookupFriendAction } from "~/lib/v1/friends";
import { asNonEmptyString, isRecord, jsonError, jsonFromOkResult, readJsonBody } from "~/lib/v1/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok || !isRecord(body.data)) {
    return jsonError("Enter a username or UID.", 400);
  }
  const query = asNonEmptyString(body.data.query) ?? asNonEmptyString(body.data.uid);
  if (!query) {
    return jsonError("Enter a username or UID.", 400);
  }
  return jsonFromOkResult(await lookupFriendAction(query));
}
