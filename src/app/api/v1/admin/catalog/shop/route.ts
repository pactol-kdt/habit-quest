import { listCatalogShopItemsAction, saveCatalogShopItemAction } from "~/lib/v1/admin";
import { isRecord, jsonError, jsonFromOkResult, readJsonBody } from "~/lib/v1/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return jsonFromOkResult(await listCatalogShopItemsAction());
}

export async function PUT(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok || !isRecord(body.data)) {
    return jsonError("Id and name are required.", 400);
  }
  return jsonFromOkResult(
    await saveCatalogShopItemAction(body.data as Parameters<typeof saveCatalogShopItemAction>[0]),
  );
}
