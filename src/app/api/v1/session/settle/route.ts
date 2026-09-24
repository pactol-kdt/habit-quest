import { settleSessionAction } from "~/lib/v1/settle";
import { jsonFromUnauthenticatedOrError, jsonOk } from "~/lib/v1/http";
import { patchBodyFromOk } from "~/lib/v1/patch-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const result = await settleSessionAction();
  if (result.status !== "ok") {
    return jsonFromUnauthenticatedOrError(result);
  }
  return jsonOk(patchBodyFromOk(result) as Record<string, unknown>);
}
