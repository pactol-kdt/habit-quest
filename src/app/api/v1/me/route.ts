import { getSession, updateAccountDisplayName } from "~/lib/v1/identity";
import {
  asNonEmptyString,
  isRecord,
  jsonError,
  jsonOk,
  readJsonBody,
} from "~/lib/v1/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return jsonError("Sign in required.", 401);
  }
  return jsonOk({ user });
}

export async function PATCH(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError(body.error, 400);
  }
  if (!isRecord(body.data)) {
    return jsonError("displayName is required.", 400);
  }

  const displayName = asNonEmptyString(body.data.displayName) ?? "";
  const result = await updateAccountDisplayName(displayName);
  if (!result.ok) {
    if (result.error === "Not signed in.") {
      return jsonError("Sign in required.", 401);
    }
    return jsonError(result.error, 400);
  }
  return jsonOk({ user: result.user });
}
