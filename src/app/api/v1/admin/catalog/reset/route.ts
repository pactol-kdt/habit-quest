import { resetCatalogFromBuiltinAction } from "~/lib/v1/admin";
import { jsonFromOkResult } from "~/lib/v1/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return jsonFromOkResult(await resetCatalogFromBuiltinAction());
}
