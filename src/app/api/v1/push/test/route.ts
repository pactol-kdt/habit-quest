import { sendTestPushAction } from "~/lib/v1/push";
import { jsonError, jsonFromUnauthenticatedOrError, jsonOk } from "~/lib/v1/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const result = await sendTestPushAction();
  if (result.status === "not_configured") {
    return jsonError(result.error, 503);
  }
  if (result.status !== "ok") {
    return jsonFromUnauthenticatedOrError(result);
  }
  return jsonOk({ sent: result.sent, failed: result.failed });
}
