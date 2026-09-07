import { purchaseShopItemAction } from "~/lib/v1/shop";
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
    return jsonError("itemId is required.", 400);
  }
  const itemId = asNonEmptyString(body.data.itemId);
  if (!itemId) {
    return jsonError("itemId is required.", 400);
  }
  const result = await purchaseShopItemAction(itemId);
  if (result.status !== "ok") {
    return jsonFromUnauthenticatedOrError(result);
  }
  return jsonOk({
    itemId: result.itemId,
    wallet: result.wallet,
    updatedAt: result.updatedAt,
  });
}
