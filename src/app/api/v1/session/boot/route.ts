import { bootHabitQuestSessionAction } from "~/lib/v1/sync";
import { isRecord, jsonError, jsonOk, readJsonBody } from "~/lib/v1/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok || !isRecord(body.data)) {
    return jsonError("localPayload is required.", 400);
  }
  const result = await bootHabitQuestSessionAction(body.data.localPayload, {
    extractLocal: Boolean(body.data.extractLocal),
  });
  return jsonOk(result);
}
