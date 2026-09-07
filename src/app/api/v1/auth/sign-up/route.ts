import { signUp } from "~/lib/v1/identity";
import {
  asNonEmptyString,
  isRecord,
  jsonError,
  jsonOk,
  readJsonBody,
  statusForCommandError,
} from "~/lib/v1/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError(body.error, 400);
  }
  if (!isRecord(body.data)) {
    return jsonError("email and password are required.", 400);
  }

  const email = asNonEmptyString(body.data.email);
  const password = typeof body.data.password === "string" ? body.data.password : "";
  const displayName =
    typeof body.data.displayName === "string" ? body.data.displayName : "";
  if (!email) {
    return jsonError("email and password are required.", 400);
  }

  const result = await signUp(email, password, displayName);
  if (!result.ok) {
    return jsonError(result.error, statusForCommandError(result.error));
  }
  return jsonOk({ user: result.user }, 201);
}
