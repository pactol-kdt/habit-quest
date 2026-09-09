import {
  PASSWORD_RESET_DISABLED_MESSAGE,
  PASSWORD_RESET_ENABLED,
} from "~/lib/auth/password-reset-enabled";
import { requestPasswordReset, resolveAppOrigin } from "~/lib/v1/password-reset";
import {
  asNonEmptyString,
  isRecord,
  jsonError,
  jsonOk,
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
    return jsonError("email is required.", 400);
  }

  const email = asNonEmptyString(body.data.email);
  if (!email) {
    return jsonError("email is required.", 400);
  }

  const result = await requestPasswordReset(email, resolveAppOrigin(request));
  return jsonOk({ message: result.message });
}
