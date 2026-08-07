"use server";

import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { AuthUser } from "~/lib/auth/session-types";
import {
  createSession,
  destroySession,
  getCurrentUser,
} from "~/lib/auth/session";
import { hashPassword, verifyPassword } from "~/lib/auth/password";
import { ensureDatabase } from "~/lib/db";
import { users } from "~/lib/db/schema";

export type { AuthUser } from "~/lib/auth/session-types";

export type AuthActionResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: string };

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validateCredentials(email: string, password: string) {
  if (!email || !email.includes("@")) {
    return "Enter a valid email address.";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  return null;
}

export async function getSessionAction(): Promise<AuthUser | null> {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

export async function signUpAction(
  emailInput: string,
  password: string,
  displayName = "",
): Promise<AuthActionResult> {
  const email = normalizeEmail(emailInput);
  const validationError = validateCredentials(email, password);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const database = await ensureDatabase();
  const existing = await database
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing[0]) {
    return { ok: false, error: "An account with that email already exists." };
  }

  const userCount = await database.select({ id: users.id }).from(users).limit(1);
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const role =
    !userCount[0] || (adminEmail && email === adminEmail) ? "admin" : "user";

  const now = new Date().toISOString();
  const userId = randomUUID();
  const passwordHash = await hashPassword(password);
  const resolvedName = displayName.trim().slice(0, 32);

  await database.insert(users).values({
    id: userId,
    email,
    passwordHash,
    displayName: resolvedName,
    role,
    createdAt: now,
    updatedAt: now,
  });

  await createSession(userId);

  return {
    ok: true,
    user: {
      id: userId,
      email,
      displayName: resolvedName,
      role,
    },
  };
}

export async function signInAction(
  emailInput: string,
  password: string,
): Promise<AuthActionResult> {
  const email = normalizeEmail(emailInput);
  const validationError = validateCredentials(email, password);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const database = await ensureDatabase();
  const rows = await database
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  const user = rows[0];

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { ok: false, error: "Invalid email or password." };
  }

  await createSession(user.id);

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role === "admin" ? "admin" : "user",
    },
  };
}

export async function signOutAction() {
  await destroySession();
  return { ok: true as const };
}

export async function updateAccountDisplayNameAction(displayName: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, error: "Not signed in." };
  }

  const nextName = displayName.trim().slice(0, 32);
  const database = await ensureDatabase();
  await database
    .update(users)
    .set({
      displayName: nextName,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, user.id));

  return {
    ok: true as const,
    user: {
      ...user,
      displayName: nextName,
    },
  };
}
