import { setUserRoleAction } from "~/lib/v1/admin";
import { asNonEmptyString, isRecord, jsonError, jsonFromOkResult, readJsonBody } from "~/lib/v1/http";
import type { UserRole } from "~/lib/auth/session-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const { userId } = await context.params;
  const body = await readJsonBody(request);
  if (!body.ok || !isRecord(body.data)) {
    return jsonError("Invalid role.", 400);
  }
  const role = asNonEmptyString(body.data.role);
  if (role !== "admin" && role !== "user") {
    return jsonError("Invalid role.", 400);
  }
  return jsonFromOkResult(await setUserRoleAction(userId, role as UserRole));
}
