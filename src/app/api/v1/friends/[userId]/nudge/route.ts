import { nudgeFriendAction } from "~/lib/v1/friends";
import { jsonFromOkResult } from "~/lib/v1/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const { userId } = await context.params;
  return jsonFromOkResult(await nudgeFriendAction(userId));
}
