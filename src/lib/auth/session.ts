import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import type { AuthUser } from "~/lib/auth/session-types";
import { ensureDatabase } from "~/lib/db";
import { sessions, users, type DbUser } from "~/lib/db/schema";

export type { AuthUser } from "~/lib/auth/session-types";

export const SESSION_COOKIE = "habitquest_session";
const SESSION_DAYS = 30;

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 16) {
    return secret;
  }

  if (process.env.NODE_ENV !== "production") {
    return "dev-only-change-me-habitquest-secret-key";
  }

  throw new Error(
    "AUTH_SECRET is missing or too short. Set a 32+ character secret in .env.production or your host env.",
  );
}

export function hashSessionToken(token: string) {
  return createHash("sha256")
    .update(`${token}:${getAuthSecret()}`)
    .digest("hex");
}

export function createSessionToken() {
  return randomBytes(32).toString("hex");
}

function toAuthUser(user: DbUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role === "admin" ? "admin" : "user",
  };
}

export async function createSession(userId: string) {
  const database = await ensureDatabase();
  const token = createSessionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await database.insert(sessions).values({
    id: randomUUID(),
    userId,
    tokenHash: hashSessionToken(token),
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    const database = await ensureDatabase();
    await database
      .delete(sessions)
      .where(eq(sessions.tokenHash, hashSessionToken(token)));
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const database = await ensureDatabase();
  const tokenHash = hashSessionToken(token);
  const rows = await database
    .select({
      session: sessions,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);

  const row = rows[0];
  if (!row) {
    cookieStore.delete(SESSION_COOKIE);
    return null;
  }

  if (new Date(row.session.expiresAt).getTime() <= Date.now()) {
    await database.delete(sessions).where(eq(sessions.id, row.session.id));
    cookieStore.delete(SESSION_COOKIE);
    return null;
  }

  return toAuthUser(row.user);
}
