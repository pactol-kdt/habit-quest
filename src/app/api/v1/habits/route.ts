import { createHabit, listHabits } from "~/lib/v1/habits";
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

export async function GET() {
  const result = await listHabits();
  if (result.status !== "ok") {
    return jsonFromUnauthenticatedOrError(result);
  }
  return jsonOk({ habits: result.habits, updatedAt: result.updatedAt });
}

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError(body.error, 400);
  }
  if (!isRecord(body.data)) {
    return jsonError("Invalid habit form values.", 400);
  }

  const habitId = asNonEmptyString(body.data.id) ?? undefined;
  const result = await createHabit(body.data, habitId);
  if (result.status !== "ok") {
    return jsonFromUnauthenticatedOrError(result);
  }
  return jsonOk(
    {
      habitId: result.habitId,
      habit: result.habit,
      updatedAt: result.updatedAt,
    },
    201,
  );
}
