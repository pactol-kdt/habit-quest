import { deleteHabit, updateHabit } from "~/lib/v1/habits";
import {
  isRecord,
  jsonError,
  jsonFromUnauthenticatedOrError,
  jsonOk,
  readJsonBody,
} from "~/lib/v1/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ habitId: string }> },
) {
  const { habitId } = await context.params;
  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError(body.error, 400);
  }
  if (!isRecord(body.data)) {
    return jsonError("Invalid habit update.", 400);
  }

  const result = await updateHabit(habitId, body.data);
  if (result.status !== "ok") {
    return jsonFromUnauthenticatedOrError(result);
  }
  return jsonOk({
    habitId: result.habitId,
    habit: result.habit,
    updatedAt: result.updatedAt,
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ habitId: string }> },
) {
  const { habitId } = await context.params;
  const result = await deleteHabit(habitId);
  if (result.status !== "ok") {
    return jsonFromUnauthenticatedOrError(result);
  }
  return jsonOk({
    habitId: result.habitId,
    habit: result.habit,
    userProgress: result.userProgress,
    updatedAt: result.updatedAt,
  });
}
