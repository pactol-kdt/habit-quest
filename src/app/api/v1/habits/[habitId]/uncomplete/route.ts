import { uncompleteHabit } from "~/lib/v1/habits";
import {
  asNonEmptyString,
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
  if (!body.ok) {
    return jsonError(body.error, 400);
  }
  if (!isRecord(body.data)) {
    return jsonError("dateKey must be YYYY-MM-DD.", 400);
  }

  const dateKey = asNonEmptyString(body.data.dateKey);
  if (!dateKey) {
    return jsonError("dateKey must be YYYY-MM-DD.", 400);
  }

  const result = await uncompleteHabit(habitId, dateKey);
  if (result.status !== "ok") {
    return jsonFromUnauthenticatedOrError(result);
  }
  return jsonOk({
    habitId: result.habitId,
    date: result.date,
    completion: result.completion,
    rewardSystems: result.rewardSystems,
    updatedAt: result.updatedAt,
  });
}
