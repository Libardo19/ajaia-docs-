/** Browser-side fetch helper: parses our `{ error: { code, message } }` shape into a typed error. */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(input: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, {
      ...init,
      headers:
        init?.body && !(init.body instanceof FormData)
          ? { "Content-Type": "application/json", ...init.headers }
          : init?.headers,
    });
  } catch {
    throw new ApiClientError("Network error — check your connection.", 0, "network_error");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = data?.error;
    throw new ApiClientError(err?.message ?? `Request failed (${res.status})`, res.status, err?.code ?? "unknown", err?.details);
  }
  return data as T;
}
