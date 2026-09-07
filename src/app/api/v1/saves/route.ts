import { pullHabitQuestSaveAction, pushHabitQuestSaveAction } from "~/lib/v1/sync";
import { isRecord, jsonError, jsonFromUnauthenticatedOrError, jsonOk, readJsonBody } from "~/lib/v1/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await pullHabitQuestSaveAction();
  if (result.status === "unauthenticated") {
    return jsonError("Sign in required.", 401);
  }
  if (result.status === "error") {
    return jsonError(result.error, 500);
  }
  return jsonOk(result);
}

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok || !isRecord(body.data)) {
    return jsonError("payload is required.", 400);
  }
  const result = await pushHabitQuestSaveAction(body.data.payload);
  if (result.status === "unauthenticated") {
    return jsonError("Sign in required.", 401);
  }
  if (result.status === "invalid") {
    return jsonError(result.error, 400);
  }
  if (result.status === "error") {
    return jsonFromUnauthenticatedOrError(result);
  }
  return jsonOk({
    updatedAt: result.updatedAt,
    version: result.version,
    migrated: result.migrated,
  });
}
