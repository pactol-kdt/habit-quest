import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "~/lib/auth/session";
import { signOut } from "~/lib/v1/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await signOut();
  const response = NextResponse.json({ ok: true, signedOut: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
