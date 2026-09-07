import { unequipShopItemAction } from "~/lib/v1/shop";
import {
  asNonEmptyString,
  isRecord,
  jsonError,
  jsonFromUnauthenticatedOrError,
  jsonOk,
  readJsonBody,
} from "~/lib/v1/http";
import type { ShopCategory } from "~/types/habitquest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES = new Set(["title", "frame", "avatar", "theme"]);

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok || !isRecord(body.data)) {
    return jsonError("Invalid shop category.", 400);
  }
  const category = asNonEmptyString(body.data.category);
  if (!category || !CATEGORIES.has(category)) {
    return jsonError("Invalid shop category.", 400);
  }
  const result = await unequipShopItemAction(category as ShopCategory);
  if (result.status !== "ok") {
    return jsonFromUnauthenticatedOrError(result);
  }
  return jsonOk({
    itemId: result.itemId,
    equippedItems: result.equippedItems,
    updatedAt: result.updatedAt,
  });
}
