export type V1Ok<T extends Record<string, unknown>> = { ok: true } & T;
export type V1Err = { ok: false; error: string };

export function jsonOk<T extends Record<string, unknown>>(data: T, status = 200) {
  return Response.json({ ok: true, ...data } satisfies V1Ok<T>, { status });
}

export function jsonError(error: string, status: number) {
  return Response.json({ ok: false, error } satisfies V1Err, { status });
}

export async function readJsonBody(
  request: Request,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  try {
    return { ok: true, data: await request.json() };
  } catch {
    return { ok: false, error: "Request body must be JSON." };
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function asNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

/** Map shared command results onto HTTP status codes. */
export function statusForCommandError(error: string) {
  if (/unauthenticated|not signed in|sign in required/i.test(error)) {
    return 401;
  }
  if (/admin access required/i.test(error)) {
    return 403;
  }
  if (/no cloud save/i.test(error)) {
    return 404;
  }
  if (/required|must be|invalid/i.test(error)) {
    return 400;
  }
  return 409;
}

export function jsonFromUnauthenticatedOrError(
  result: { status: "unauthenticated" } | { status: "error"; error: string },
) {
  if (result.status === "unauthenticated") {
    return jsonError("Sign in required.", 401);
  }
  return jsonError(result.error, statusForCommandError(result.error));
}

export function jsonFromOkResult<T extends { ok: true } | { ok: false; error: string }>(
  result: T,
  successStatus = 200,
) {
  if (!result.ok) {
    return jsonError(result.error, statusForCommandError(result.error));
  }
  const { ok: _ok, ...data } = result;
  return jsonOk(data as Record<string, unknown>, successStatus);
}
