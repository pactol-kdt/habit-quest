import { NextResponse } from "next/server";
import { ensureDatabase } from "~/lib/db";
import { dispatchDuePushReminders } from "~/lib/push/reminders-dispatch";
import { isWebPushConfigured } from "~/lib/push/web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) {
    return true;
  }

  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json(
      { error: "Web Push is not configured (missing VAPID keys)." },
      { status: 503 },
    );
  }

  const database = await ensureDatabase();
  const result = await dispatchDuePushReminders(database);
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
