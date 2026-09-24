import { declineFriendRequestAction } from "~/lib/v1/friends";
import { jsonFromOkResult } from "~/lib/v1/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await context.params;
  return jsonFromOkResult(await declineFriendRequestAction(requestId));
}
