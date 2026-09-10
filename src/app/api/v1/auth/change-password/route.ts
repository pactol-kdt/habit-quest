import { changePassword } from "~/lib/v1/identity";
import {
  isRecord,
  jsonError,
  jsonOk,
  jsonFromOkResult,
  readJsonBody,
} from "~/lib/v1/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError(body.error, 400);
  }
  if (!isRecord(body.data)) {
    return jsonError("currentPassword and nextPassword are required.", 400);
  }

  const currentPassword =
    typeof body.data.currentPassword === "string" ? body.data.currentPassword : "";
  const nextPassword =
    typeof body.data.nextPassword === "string" ? body.data.nextPassword : "";

  const result = await changePassword(currentPassword, nextPassword);
  if (!result.ok) {
    return jsonFromOkResult(result);
  }
  return jsonOk({ user: result.user });
}
