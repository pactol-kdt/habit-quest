export type V1Success<T> = { ok: true; status: number; data: T };
export type V1Failure = { ok: false; status: number; error: string };
export type V1Result<T> = V1Success<T> | V1Failure;

const V1_PREFIX = "/api/v1";

export async function v1Request<T extends Record<string, unknown>>(
  path: string,
  init: { method?: string; json?: unknown } = {},
): Promise<V1Result<T>> {
  const headers = new Headers();
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${V1_PREFIX}${path}`, {
      method: init.method ?? (init.json !== undefined ? "POST" : "GET"),
      credentials: "include",
      cache: "no-store",
      headers,
      body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
    });
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : "Network error.",
    };
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    return {
      ok: false,
      status: response.status,
      error: response.ok ? "Empty response." : `Request failed (${response.status}).`,
    };
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, status: response.status, error: "Unexpected response." };
  }

  const body = payload as { ok?: boolean; error?: string } & Record<string, unknown>;
  if (body.ok === false || !response.ok) {
    return {
      ok: false,
      status: response.status,
      error: typeof body.error === "string" ? body.error : `Request failed (${response.status}).`,
    };
  }

  const { ok: _ok, ...data } = body;
  return { ok: true, status: response.status, data: data as T };
}

export function asStatusResult<T extends Record<string, unknown>>(
  result: V1Result<T>,
): ({ status: "ok" } & T) | { status: "unauthenticated" } | { status: "error"; error: string } {
  if (result.status === 401) {
    return { status: "unauthenticated" };
  }
  if (!result.ok) {
    return { status: "error", error: result.error };
  }
  return { status: "ok", ...result.data };
}

export function asCommand<T>(result: V1Result<Record<string, unknown>>): T {
  return asStatusResult(result) as T;
}
