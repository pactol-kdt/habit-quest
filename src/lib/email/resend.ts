import "server-only";

export async function sendTransactionalEmail(options: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: true; delivered: boolean } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || "HabitQuest <onboarding@resend.dev>";

  if (!apiKey) {
    return { ok: true, delivered: false };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return {
        ok: false,
        error: detail.trim() || `Resend request failed (${response.status}).`,
      };
    }

    return { ok: true, delivered: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to send email.",
    };
  }
}
