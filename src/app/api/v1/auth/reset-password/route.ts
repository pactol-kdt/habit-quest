import {
  PASSWORD_RESET_DISABLED_MESSAGE,
  PASSWORD_RESET_ENABLED,
} from "~/lib/auth/password-reset-enabled";
import { resetPasswordWithToken } from "~/lib/v1/password-reset";
import {
  asNonEmptyString,
  isRecord,
  jsonError,
  jsonFromOkResult,
  readJsonBody,
} from "~/lib/v1/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!PASSWORD_RESET_ENABLED) {
    return jsonError(PASSWORD_RESET_DISABLED_MESSAGE, 404);
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError(body.error, 400);
  }
  if (!isRecord(body.data)) {
    return jsonError("token and password are required.", 400);
  }

  const token = asNonEmptyString(body.data.token);
  const password = typeof body.data.password === "string" ? body.data.password : "";
  if (!token) {
    return jsonError("token and password are required.", 400);
  }

  const result = await resetPasswordWithToken(token, password);
  return jsonFromOkResult(result);
}
