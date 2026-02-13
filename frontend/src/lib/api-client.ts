const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
  [key: string]: any;
};

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function buildJsonHeaders(accessToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }
  return headers;
}

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, init);

  const raw = (await res
    .json()
    .catch(() => ({}))) as ApiEnvelope<T> | T | any;

  if (!res.ok) {
    const message =
      (raw && (raw.message || raw.error || raw.code)) ||
      res.statusText ||
      "Request failed";
    throw new Error(message);
  }

  const envelope = raw as ApiEnvelope<T>;
  if (typeof envelope === "object" && "data" in envelope) {
    return (envelope.data as T) ?? (raw as T);
  }

  return raw as T;
}

