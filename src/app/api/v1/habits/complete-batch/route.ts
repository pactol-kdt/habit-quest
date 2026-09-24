import { completeHabits } from "~/lib/v1/habits";
import { isRecord, jsonError, jsonFromUnauthenticatedOrError, jsonOk, readJsonBody } from "~/lib/v1/http";
import { patchBodyFromOk } from "~/lib/v1/patch-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok || !isRecord(body.data)) {
    return jsonError("Invalid habit batch payload.", 400);
  }

  const dateKey = body.data.dateKey;
  const habitIds = body.data.habitIds;
  if (typeof dateKey !== "string" || !Array.isArray(habitIds)) {
    return jsonError("habitIds and dateKey are required.", 400);
  }

  const result = await completeHabits(
    habitIds.filter((id): id is string => typeof id === "string"),
    dateKey,
  );

  if (result.status !== "ok") {
    return jsonFromUnauthenticatedOrError(result);
  }

  return jsonOk(patchBodyFromOk(result) as Record<string, unknown>);
}
