import { acceptFriendRequestAction } from "~/lib/v1/friends";
import { jsonFromOkResult } from "~/lib/v1/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await context.params;
  return jsonFromOkResult(await acceptFriendRequestAction(requestId));
}
