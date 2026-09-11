import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

export type InlineEmailImage = {
  filename: string;
  contentId: string;
  contentBase64: string;
  contentType: string;
};

const LOGO_CONTENT_ID = "habitquest-logo";
let cachedLogo: InlineEmailImage | null | undefined;

/**
 * Best-effort local logo for CID embedding (useful on localhost where
 * remote `/brand/...` URLs are not reachable from email clients).
 * On Vercel/serverless the public folder is often not on disk — returns null.
 */
export async function getHabitQuestLogoAttachment(): Promise<InlineEmailImage | null> {
  if (cachedLogo !== undefined) {
    return cachedLogo;
  }

  try {
    const logoPath = path.join(process.cwd(), "public", "brand", "habitquest-logo.png");
    const source = await readFile(logoPath);
    // Keep the PNG as-is (no sharp) so serverless runtimes without native
    // sharp binaries still work when the file happens to be present.
    cachedLogo = {
      filename: "habitquest-logo.png",
      contentId: LOGO_CONTENT_ID,
      contentBase64: source.toString("base64"),
      contentType: "image/png",
    };
    return cachedLogo;
  } catch {
    cachedLogo = null;
    return null;
  }
}

export function habitQuestLogoCidSrc() {
  return `cid:${LOGO_CONTENT_ID}`;
}

export function habitQuestLogoPublicSrc(origin: string) {
  return `${origin.replace(/\/$/, "")}/brand/habitquest-logo.png`;
}
