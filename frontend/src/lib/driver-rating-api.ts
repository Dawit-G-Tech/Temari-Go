const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface DriverRatingBreakdownPart {
  score: number;
  weight: string;
}

export interface DriverRatingRecord {
  id: number;
  driver_id: number;
  safety_compliance_score?: number | null;
  parental_feedback_score?: number | null;
  operational_performance_score?: number | null;
  overall_score?: number | null;
  missed_pickups?: number | null;
  period_start: string;
  period_end: string;
  breakdown?: {
    safety_compliance: DriverRatingBreakdownPart;
    parental_feedback: DriverRatingBreakdownPart;
    operational_performance: DriverRatingBreakdownPart;
  };
}

export interface DriverRatingsResponse {
  current: DriverRatingRecord | null;
  historical: DriverRatingRecord[];
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

export const driverRatingAPI = {
  async getForDriver(
    driverId: number,
    options: { limit?: number; accessToken?: string } = {}
  ): Promise<DriverRatingsResponse> {
    const search = new URLSearchParams();
    if (typeof options.limit === "number") {
      search.set("limit", String(options.limit));
    }
    const qs = search.toString();
    const url = `${API_BASE_URL}/api/driver-ratings/driver/${driverId}${
      qs ? `?${qs}` : ""
    }`;

    const res = await fetch(url, {
      method: "GET",
      headers: getHeaders(options.accessToken),
      credentials: "include",
    });

    if (!res.ok) {
      const err = await parseJson<any>(res);
      throw new Error(err.message || "Failed to fetch driver ratings");
    }

    const body = await parseJson<ApiEnvelope<DriverRatingsResponse>>(res);
    const data = (body as any).data ?? body;
    return data as DriverRatingsResponse;
  },
};

