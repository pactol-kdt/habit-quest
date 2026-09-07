import { listCatalogAchievementsAction, saveCatalogAchievementAction } from "~/lib/v1/admin";
import { isRecord, jsonError, jsonFromOkResult, readJsonBody } from "~/lib/v1/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return jsonFromOkResult(await listCatalogAchievementsAction());
}

export async function PUT(request: Request) {
  const body = await readJsonBody(request);
  if (!body.ok || !isRecord(body.data)) {
    return jsonError("Key and title are required.", 400);
  }
  return jsonFromOkResult(
    await saveCatalogAchievementAction(
      body.data as Parameters<typeof saveCatalogAchievementAction>[0],
    ),
  );
}
