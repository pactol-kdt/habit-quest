import { removePushSubscriptionAction, savePushSubscriptionAction } from "~/lib/v1/push";
import {
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
  if (!body.ok || !isRecord(body.data) || !isRecord(body.data.subscription)) {
    return jsonError("Invalid push subscription payload.", 400);
  }
  const subscription = body.data.subscription;
  const result = await savePushSubscriptionAction(
    {
      endpoint: typeof subscription.endpoint === "string" ? subscription.endpoint : "",
      keys: isRecord(subscription.keys)
        ? {
            p256dh: typeof subscription.keys.p256dh === "string" ? subscription.keys.p256dh : undefined,
            auth: typeof subscription.keys.auth === "string" ? subscription.keys.auth : undefined,
          }
        : undefined,
    },
    typeof body.data.timeZone === "string" ? body.data.timeZone : undefined,
  );
  if (result.status === "not_configured") {
    return jsonError(result.error, 503);
  }
  if (result.status !== "ok") {
    return jsonFromUnauthenticatedOrError(result);
  }
  return jsonOk({ saved: true });
}

export async function DELETE(request: Request) {
  const body = await readJsonBody(request);
  const endpoint =
    body.ok && isRecord(body.data) && typeof body.data.endpoint === "string"
      ? body.data.endpoint
      : null;
  const result = await removePushSubscriptionAction(endpoint);
  if (result.status === "not_configured") {
    return jsonError(result.error, 503);
  }
  if (result.status !== "ok") {
    return jsonFromUnauthenticatedOrError(result);
  }
  return jsonOk({ removed: true });
}
