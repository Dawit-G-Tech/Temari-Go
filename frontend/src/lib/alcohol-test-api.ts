const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface AlcoholTest {
  id: number;
  driver_id: number;
  bus_id: number;
  bus?: {
    id: number;
    bus_number: string;
  };
  alcohol_level: number;
  passed: boolean;
  latitude?: number | null;
  longitude?: number | null;
  timestamp: string;
}

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
};

function getHeaders(accessToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }
  return headers;
}

async function parseJson<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  return json as T;
}

export const alcoholTestAPI = {
  async getDriverTests(
    driverId: number,
    options: {
      startDate?: string;
      endDate?: string;
      limit?: number;
      accessToken?: string;
    } = {}
  ): Promise<AlcoholTest[]> {
    const search = new URLSearchParams();
    if (options.startDate) search.set("startDate", options.startDate);
    if (options.endDate) search.set("endDate", options.endDate);
    if (typeof options.limit === "number")
      search.set("limit", String(options.limit));

    const qs = search.toString();
    const url = `${API_BASE_URL}/api/alcohol-tests/driver/${driverId}${
      qs ? `?${qs}` : ""
    }`;

    const res = await fetch(url, {
      method: "GET",
      headers: getHeaders(options.accessToken),
      credentials: "include",
    });

    if (!res.ok) {
      const err = await parseJson<any>(res);
      throw new Error(err.message || "Failed to fetch alcohol tests");
    }

    const body = await parseJson<ApiEnvelope<AlcoholTest[]>>(res);
    const data = (body as any).data ?? body;
    return (Array.isArray(data) ? data : []) as AlcoholTest[];
  },
};

