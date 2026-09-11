import "server-only";

import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { createOpaqueToken, hashOpaqueToken } from "~/lib/auth/opaque-token";
import { hashPassword } from "~/lib/auth/password";
import { sendTransactionalEmail } from "~/lib/email/resend";
import { getHabitQuestLogoAttachment } from "~/lib/email/brand-assets";
import { buildPasswordResetEmail } from "~/lib/email/templates/password-reset";
import { ensureDatabase } from "~/lib/db";
import { passwordResetTokens, users } from "~/lib/db/schema";

const RESET_TTL_MS = 60 * 60 * 1000;
const GENERIC_OK = "If that email has an account, we sent a reset link.";

function getTokenSecret() {
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

function hashResetToken(token: string) {
  return hashOpaqueToken(token, getTokenSecret());
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function resolveAppOrigin(request: Request) {
  const configured = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return new URL(request.url).origin;
}

export async function requestPasswordReset(emailInput: string, origin: string) {
  const email = normalizeEmail(emailInput);
  if (!email || !email.includes("@")) {
    return { ok: true as const, message: GENERIC_OK };
  }

  const database = await ensureDatabase();
  const rows = await database
    .select({ id: users.id, email: users.email, displayName: users.displayName })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  const user = rows[0];

  if (!user) {
    return { ok: true as const, message: GENERIC_OK };
  }

  await database.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));

  const token = createOpaqueToken();
  const now = new Date();
  await database.insert(passwordResetTokens).values({
    id: randomUUID(),
    userId: user.id,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(now.getTime() + RESET_TTL_MS).toISOString(),
    createdAt: now.toISOString(),
  });

  const resetUrl = `${origin}/reset-password?token=${token}`;
  const mail = buildPasswordResetEmail({
    resetUrl,
    origin,
    email: user.email,
    displayName: user.displayName,
    expiresInHours: 1,
  });
  const logo = await getHabitQuestLogoAttachment();
  const mailed = await sendTransactionalEmail({
    to: user.email,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    inlineImages: [logo],
  });

  if (!mailed.ok) {
    console.error("[habitquest] Password reset email failed:", mailed.error);
  }

  if (!mailed.ok || !mailed.delivered) {
    console.info(`[habitquest] Password reset URL for ${user.email}: ${resetUrl}`);
  }

  return { ok: true as const, message: GENERIC_OK };
}

export async function resetPasswordWithToken(token: string, password: string) {
  if (!token.trim()) {
    return { ok: false as const, error: "This reset link is invalid or expired." };
  }
  if (password.length < 8) {
    return { ok: false as const, error: "Password must be at least 8 characters." };
  }

  const database = await ensureDatabase();
  const tokenHash = hashResetToken(token.trim());
  const rows = await database
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);
  const row = rows[0];

  if (!row) {
    return { ok: false as const, error: "This reset link is invalid or expired." };
  }

  if (new Date(row.expiresAt).getTime() <= Date.now()) {
    await database.delete(passwordResetTokens).where(eq(passwordResetTokens.id, row.id));
    return { ok: false as const, error: "This reset link is invalid or expired." };
  }

  const now = new Date().toISOString();
  await database
    .update(users)
    .set({
      passwordHash: await hashPassword(password),
      updatedAt: now,
    })
    .where(eq(users.id, row.userId));

  await database.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, row.userId));

  return { ok: true as const };
}
