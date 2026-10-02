import { recordHabitReflection } from "~/lib/v1/habits";
import {
  isRecord,
  jsonError,
  jsonFromUnauthenticatedOrError,
  jsonOk,
  readJsonBody,
} from "~/lib/v1/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ habitId: string }> },
) {
  const { habitId } = await context.params;
  const body = await readJsonBody(request);
  if (!body.ok || !isRecord(body.data)) {
    return jsonError("Invalid reflection.", 400);
  }

  const dateKey = body.data.dateKey;
  if (typeof dateKey !== "string") {
    return jsonError("dateKey must be YYYY-MM-DD.", 400);
  }

  const result = await recordHabitReflection(habitId, dateKey, body.data.reflection);
  if (result.status !== "ok") {
    return jsonFromUnauthenticatedOrError(result);
  }

  return jsonOk({
    habitId: result.habitId,
    date: result.date,
    completion: result.completion,
  });
}
