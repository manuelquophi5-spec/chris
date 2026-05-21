/** Client-side auth API helpers — always send cookies on same-origin requests. */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: "include",
  });
}

export async function parseJsonResponse<T extends { error?: string }>(
  res: Response,
): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return { error: res.ok ? undefined : `Request failed (${res.status})` } as T;
  }
}

/** Full page navigation so the session cookie is applied before RSC/middleware run. */
export function redirectAfterAuth(path: string) {
  window.location.assign(path);
}
