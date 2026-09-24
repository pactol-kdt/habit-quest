import { uncompleteHabit } from "~/lib/v1/habits";
import {
  asNonEmptyString,
  isRecord,
  jsonError,
  jsonFromUnauthenticatedOrError,
  jsonOk,
  readJsonBody,
} from "~/lib/v1/http";
import { patchBodyFromOk } from "~/lib/v1/patch-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError(body.error, 400);
  }
  if (!isRecord(body.data)) {
    return jsonError("habitId and dateKey are required.", 400);
  }

  const habitId = asNonEmptyString(body.data.habitId);
  const dateKey = asNonEmptyString(body.data.dateKey);
  if (!habitId || !dateKey) {
    return jsonError("habitId and dateKey are required.", 400);
  }

  const result = await uncompleteHabit(habitId, dateKey);
  if (result.status !== "ok") {
    return jsonFromUnauthenticatedOrError(result);
  }
  return jsonOk(patchBodyFromOk(result) as Record<string, unknown>);
}
