import "server-only";

import {
  habitQuestLogoCidSrc,
  habitQuestLogoPublicSrc,
} from "~/lib/email/brand-assets";

export type PasswordResetEmailContent = {
  subject: string;
  text: string;
  html: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function greetingName(displayName: string | undefined, email: string) {
  const trimmed = displayName?.trim();
  if (trimmed) {
    return trimmed;
  }
  const local = email.split("@")[0]?.trim();
  return local || "adventurer";
}

const FONT_DISPLAY = "'Cinzel',Georgia,'Times New Roman',serif";
const FONT_BODY = "'Space Grotesk',Arial,Helvetica,sans-serif";

export function buildPasswordResetEmail(options: {
  resetUrl: string;
  origin: string;
  email: string;
  displayName?: string;
  expiresInHours?: number;
  /** When true, HTML references cid:habitquest-logo (attachment required). */
  inlineLogo?: boolean;
}): PasswordResetEmailContent {
  const expiresInHours = options.expiresInHours ?? 1;
  const name = greetingName(options.displayName, options.email);
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(options.resetUrl);
  const safeOrigin = escapeHtml(options.origin);
  const logoSrc = options.inlineLogo
    ? habitQuestLogoCidSrc()
    : habitQuestLogoPublicSrc(options.origin);
  const safeLogoSrc = escapeHtml(logoSrc);

  const subject = "Reset your HabitQuest password";

  const text = [
    `Hi ${name},`,
    "",
    "We received a request to reset the password for your HabitQuest account.",
    `This link expires in ${expiresInHours} hour${expiresInHours === 1 ? "" : "s"}.`,
    "",
    "Reset your password:",
    options.resetUrl,
    "",
    "If you did not ask for this, you can ignore this email. Your password will stay the same.",
    "",
    "— HabitQuest",
    options.origin,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en" style="color-scheme:light dark;">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${escapeHtml(subject)}</title>
  <!--[if !mso]><!-->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <!--<![endif]-->
  <style>
    :root { color-scheme: light dark; }
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');

    /* Light (default) — trustworthy in most inboxes */
    body, .hq-body { background:#eef3f9 !important; color:#334155 !important; }
    .hq-shell { background:#eef3f9 !important; }
    .hq-card { background:#ffffff !important; border-color:#d7e0ec !important; }
    .hq-hero { background:linear-gradient(180deg, rgba(14,165,233,0.12) 0%, rgba(255,255,255,0) 100%) !important; }
    .hq-logo { border-color:rgba(15,23,42,0.10) !important; }
    .hq-eyebrow { color:#64748b !important; }
    .hq-title { color:#0f172a !important; }
    .hq-text { color:#334155 !important; }
    .hq-hi { color:#0f172a !important; }
    .hq-muted { color:#64748b !important; }
    .hq-strong { color:#0f172a !important; }
    .hq-linkbox { background:#f1f5f9 !important; border-color:#d7e0ec !important; }
    .hq-link, .hq-link a { color:#0284c7 !important; }
    .hq-footer { border-top-color:#e2e8f0 !important; color:#94a3b8 !important; }
    .hq-brand, .hq-footer a { color:#64748b !important; }
    .hq-cta-wrap { background:linear-gradient(90deg,#4dd8ff,#7ec8e8,#f5c15d) !important; }
    .hq-cta { color:#041018 !important; }

    @media (prefers-color-scheme: dark) {
      body, .hq-body { background:#07111f !important; color:#c7d2e0 !important; }
      .hq-shell { background:#07111f !important; }
      .hq-card { background:#0d1729 !important; border-color:rgba(148,163,184,0.18) !important; }
      .hq-hero { background:linear-gradient(180deg, rgba(77,216,255,0.14) 0%, rgba(13,23,41,0) 100%) !important; }
      .hq-logo { border-color:rgba(255,255,255,0.12) !important; }
      .hq-eyebrow { color:#94a3b8 !important; }
      .hq-title { color:#ffffff !important; }
      .hq-text { color:#c7d2e0 !important; }
      .hq-hi { color:#e6edf7 !important; }
      .hq-muted { color:#94a3b8 !important; }
      .hq-strong { color:#e6edf7 !important; }
      .hq-linkbox { background:rgba(7,17,31,0.72) !important; border-color:rgba(148,163,184,0.14) !important; }
      .hq-link, .hq-link a { color:#4dd8ff !important; }
      .hq-footer { border-top-color:rgba(148,163,184,0.12) !important; color:#64748b !important; }
      .hq-brand, .hq-footer a { color:#94a3b8 !important; }
      .hq-cta-wrap { background:linear-gradient(90deg,#4dd8ff,#7ec8e8,#f5c15d) !important; }
      .hq-cta { color:#041018 !important; }
    }
  </style>
</head>
<body class="hq-body" style="margin:0;padding:0;background:#eef3f9;color:#334155;font-family:${FONT_BODY};-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    Use this secure HabitQuest link to choose a new password. It expires in ${expiresInHours} hour${expiresInHours === 1 ? "" : "s"}.
  </div>
  <table role="presentation" class="hq-shell" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eef3f9" style="background:#eef3f9;margin:0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" class="hq-card" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width:560px;background:#ffffff;border:1px solid #d7e0ec;border-radius:20px;overflow:hidden;">
          <tr>
            <td class="hq-hero" style="padding:28px 28px 12px 28px;background:linear-gradient(180deg, rgba(14,165,233,0.12) 0%, rgba(255,255,255,0) 100%);">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:14px;">
                    <img class="hq-logo" src="${safeLogoSrc}" width="48" height="48" alt="HabitQuest" style="display:block;width:48px;height:48px;border-radius:12px;border:1px solid rgba(15,23,42,0.10);object-fit:cover;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <div class="hq-eyebrow" style="font-family:${FONT_DISPLAY};font-size:12px;font-weight:600;letter-spacing:0.28em;text-transform:uppercase;color:#64748b;">HabitQuest</div>
                    <div class="hq-title" style="font-family:${FONT_DISPLAY};font-size:24px;font-weight:600;letter-spacing:0.08em;line-height:1.3;color:#0f172a;margin-top:6px;">Password reset</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="hq-text" style="padding:8px 28px 28px 28px;font-family:${FONT_BODY};font-size:15px;line-height:1.65;color:#334155;">
              <p class="hq-hi" style="margin:0 0 16px 0;font-family:${FONT_BODY};color:#0f172a;">Hi ${safeName},</p>
              <p class="hq-text" style="margin:0 0 16px 0;font-family:${FONT_BODY};color:#334155;">
                We received a request to reset the password for your HabitQuest account.
                Click the button below to choose a new one.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
                <tr>
                  <td align="center" class="hq-cta-wrap" style="border-radius:999px;background:linear-gradient(90deg,#4dd8ff,#7ec8e8,#f5c15d);">
                    <a class="hq-cta" href="${safeUrl}" style="display:inline-block;padding:14px 28px;font-family:${FONT_BODY};font-size:15px;font-weight:700;letter-spacing:0.04em;line-height:1;color:#041018;text-decoration:none;border-radius:999px;">
                      Reset password
                    </a>
                  </td>
                </tr>
              </table>
              <p class="hq-muted" style="margin:0 0 12px 0;font-family:${FONT_BODY};font-size:13px;color:#64748b;">
                This link expires in <strong class="hq-strong" style="color:#0f172a;">${expiresInHours} hour${expiresInHours === 1 ? "" : "s"}</strong>.
                If the button does not work, copy and paste this URL into your browser:
              </p>
              <p class="hq-linkbox hq-link" style="margin:0 0 20px 0;padding:12px 14px;background:#f1f5f9;border:1px solid #d7e0ec;border-radius:12px;font-family:${FONT_BODY};font-size:12px;line-height:1.5;word-break:break-all;color:#0284c7;">
                <a href="${safeUrl}" style="color:#0284c7;text-decoration:none;">${safeUrl}</a>
              </p>
              <p class="hq-muted" style="margin:0;font-family:${FONT_BODY};font-size:13px;color:#64748b;">
                If you did not request a password reset, you can safely ignore this email.
                Your password will not change.
              </p>
            </td>
          </tr>
          <tr>
            <td class="hq-footer" style="padding:18px 28px 24px 28px;border-top:1px solid #e2e8f0;font-family:${FONT_BODY};font-size:12px;line-height:1.6;color:#94a3b8;">
              Sent by <span class="hq-brand" style="font-family:${FONT_DISPLAY};letter-spacing:0.12em;color:#64748b;">HabitQuest</span>
              · <a href="${safeOrigin}" style="color:#64748b;text-decoration:underline;">${safeOrigin}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
