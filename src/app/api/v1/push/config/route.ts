import { getPushConfigAction } from "~/lib/v1/push";
import { jsonOk } from "~/lib/v1/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return jsonOk(await getPushConfigAction());
}
