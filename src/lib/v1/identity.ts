import "server-only";

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

export type AuthCommandResult =
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

export async function getSession(): Promise<AuthUser | null> {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

export async function signUp(
  emailInput: string,
  password: string,
  displayName = "",
): Promise<AuthCommandResult> {
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

export async function signIn(
  emailInput: string,
  password: string,
): Promise<AuthCommandResult> {
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

export async function signOut() {
  await destroySession();
  return { ok: true as const };
}

export async function updateAccountDisplayName(displayName: string) {
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

export async function changePassword(
  currentPassword: string,
  nextPassword: string,
): Promise<AuthCommandResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  if (currentPassword.length < 1) {
    return { ok: false, error: "Enter your current password." };
  }

  if (nextPassword.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  if (currentPassword === nextPassword) {
    return { ok: false, error: "Choose a different password." };
  }

  const database = await ensureDatabase();
  const rows = await database
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  const account = rows[0];
  if (!account || !(await verifyPassword(currentPassword, account.passwordHash))) {
    return { ok: false, error: "Invalid current password." };
  }

  await database
    .update(users)
    .set({
      passwordHash: await hashPassword(nextPassword),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, user.id));

  return { ok: true, user };
}
