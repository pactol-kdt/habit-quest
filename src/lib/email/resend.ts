import "server-only";

import https from "node:https";
import type { InlineEmailImage } from "~/lib/email/brand-assets";

type SendResult = { ok: true; delivered: boolean } | { ok: false; error: string };

type ResendPayload = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    content_id?: string;
    content_type?: string;
  }>;
};

function allowInsecureTls() {
  return process.env.EMAIL_TLS_INSECURE === "1" || process.env.EMAIL_TLS_INSECURE === "true";
}

async function postResendJson(
  apiKey: string,
  payload: ResendPayload,
): Promise<{ status: number; body: string }> {
  // Corporate SSL inspection can break Node's default CA trust. Opt in only via
  // EMAIL_TLS_INSECURE=1 in local env — never needed on normal Vercel/prod hosts.
  if (!allowInsecureTls()) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    return { status: response.status, body: await response.text().catch(() => "") };
  }

  const body = JSON.stringify(payload);
  return await new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.resend.com",
        path: "/emails",
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        rejectUnauthorized: false,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

export async function sendTransactionalEmail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  inlineImages?: InlineEmailImage[];
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || "HabitQuest <onboarding@resend.dev>";

  if (!apiKey) {
    return { ok: true, delivered: false };
  }

  try {
    const attachments = options.inlineImages?.map((image) => ({
      filename: image.filename,
      content: image.contentBase64,
      content_id: image.contentId,
      content_type: image.contentType,
    }));

    const response = await postResendJson(apiKey, {
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      ...(options.html ? { html: options.html } : {}),
      ...(attachments?.length ? { attachments } : {}),
    });

    if (response.status < 200 || response.status >= 300) {
      return {
        ok: false,
        error: response.body.trim() || `Resend request failed (${response.status}).`,
      };
    }

    return { ok: true, delivered: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email.";
    const cause =
      error instanceof Error && error.cause && typeof error.cause === "object" && "code" in error.cause
        ? String((error.cause as { code?: string }).code ?? "")
        : "";
    return {
      ok: false,
      error: cause ? `${message} (${cause})` : message,
    };
  }
}
