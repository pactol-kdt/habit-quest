import { parseStarterHabitKeys } from "@habitquest/shared";
import { completeOnboardingAction } from "~/lib/v1/claims";
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

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok || !isRecord(body.data)) {
    return jsonError("displayName is required.", 400);
  }
  const displayName = asNonEmptyString(body.data.displayName) ?? "";
  const starterKeys = Object.prototype.hasOwnProperty.call(body.data, "starterKeys")
    ? parseStarterHabitKeys(body.data.starterKeys)
    : undefined;
  if (Object.prototype.hasOwnProperty.call(body.data, "starterKeys") && !starterKeys) {
    return jsonError("starterKeys is invalid.", 400);
  }
  const result = await completeOnboardingAction(displayName, starterKeys ?? undefined);
  if (result.status !== "ok") {
    return jsonFromUnauthenticatedOrError(result);
  }
  return jsonOk({
    settings: result.settings,
    habits: result.habits,
    updatedAt: result.updatedAt,
  });
}
