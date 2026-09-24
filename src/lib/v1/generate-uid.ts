import { randomBytes } from "node:crypto";
import { UID_ALPHABET } from "~/lib/v1/friend-rules";

export function generateUid() {
  const bytes = randomBytes(8);
  let uid = "";
  for (let index = 0; index < 8; index += 1) {
    uid += UID_ALPHABET[bytes[index]! % UID_ALPHABET.length];
  }
  return uid;
}
