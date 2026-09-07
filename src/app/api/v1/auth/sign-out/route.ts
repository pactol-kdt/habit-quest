import { signOut } from "~/lib/v1/identity";
import { jsonOk } from "~/lib/v1/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await signOut();
  return jsonOk({ signedOut: true });
}
