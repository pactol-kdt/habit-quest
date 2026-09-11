import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export type InlineEmailImage = {
  filename: string;
  contentId: string;
  contentBase64: string;
  contentType: string;
};

const LOGO_CONTENT_ID = "habitquest-logo";
let cachedLogo: InlineEmailImage | null = null;

/** Resized HabitQuest mark for CID-inline email embedding. */
export async function getHabitQuestLogoAttachment(): Promise<InlineEmailImage> {
  if (cachedLogo) {
    return cachedLogo;
  }

  const logoPath = path.join(process.cwd(), "public", "brand", "habitquest-logo.png");
  const source = await readFile(logoPath);
  const resized = await sharp(source)
    .resize(96, 96, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toBuffer();

  cachedLogo = {
    filename: "habitquest-logo.png",
    contentId: LOGO_CONTENT_ID,
    contentBase64: resized.toString("base64"),
    contentType: "image/png",
  };
  return cachedLogo;
}

export function habitQuestLogoCidSrc() {
  return `cid:${LOGO_CONTENT_ID}`;
}
