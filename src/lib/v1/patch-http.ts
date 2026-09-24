import type { GamePatch } from "~/lib/habitquest/game-patch";

/** Drop command status and return remaining fields for jsonOk. */
export function patchBodyFromOk<T extends { status: "ok" }>(result: T): Omit<T, "status"> {
  const { status: _status, ...body } = result;
  return body;
}

export function omitUndefinedPatch(patch: GamePatch): GamePatch {
  const next: GamePatch = {};
  for (const [key, value] of Object.entries(patch) as Array<[keyof GamePatch, GamePatch[keyof GamePatch]]>) {
    if (value !== undefined) {
      (next as Record<string, unknown>)[key] = value;
    }
  }
  return next;
}
