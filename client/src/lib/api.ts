/** Centralised API client (ARCHITECTURE.md §5) — envelope-aware fetch wrapper. */
const BASE = import.meta.env.VITE_API_URL ?? "";

export class ApiClientError extends Error {
  constructor(public code: string, message: string, public details?: unknown) { super(message); }
}

let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => { accessToken = t; };

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const e = body?.error ?? { code: "UNKNOWN", message: "Request failed" };
    let msg = e.message;
    if (e.code === "VALIDATION" && e.details?.fieldErrors) {
      const fields = Object.values(e.details.fieldErrors).flat();
      if (fields.length > 0) msg = fields[0] as string;
    }
    throw new ApiClientError(e.code, msg, e.details);
  }
  return body.data as T;
}

export const post = <T>(path: string, data?: unknown) =>
  api<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined });
