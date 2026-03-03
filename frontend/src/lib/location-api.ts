const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface LocationBus {
  id: number;
  bus_number: string;
}

export interface BusLocation {
  id: number;
  bus_id: number;
  latitude: number;
  longitude: number;
  speed: number | null;
  timestamp: string; // ISO string
  bus?: LocationBus;
}

export interface LocationHistoryParams {
  startDate?: string; // ISO
  endDate?: string;   // ISO
  limit?: number;     // default 100 on backend
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

export const locationAPI = {
  async getBusCurrentLocation(
    busId: number,
    accessToken?: string
  ): Promise<BusLocation | null> {
    const url = `${API_BASE_URL}/api/locations/bus/${busId}/current`;

    const res = await fetch(url, {
      method: "GET",
      headers: getHeaders(accessToken),
      credentials: "include",
    });

    if (res.status === 404) {
      // No data yet for this bus
      return null;
    }

    if (!res.ok) {
      const err = await parseJson<any>(res);
      throw new Error(err.message || "Failed to fetch current location");
    }

    const body = await parseJson<ApiEnvelope<BusLocation | BusLocation[]>>(res);
    const data = (body as any).data ?? body;

    // Backend may return either envelope or raw data
    const normalize = (raw: any | null | undefined): BusLocation | null => {
      if (!raw) return null;

      const latitude = Number(raw.latitude);
      const longitude = Number(raw.longitude);

      return {
        ...raw,
        latitude,
        longitude,
        speed:
          raw.speed !== undefined && raw.speed !== null
            ? Number(raw.speed)
            : null,
      } as BusLocation;
    };

    if (Array.isArray(data)) {
      return normalize(data[0]);
    }
    
    return normalize(data);
  },

  async getBusLocationHistory(
    busId: number,
    params: LocationHistoryParams = {},
    accessToken?: string
  ): Promise<BusLocation[]> {
    const search = new URLSearchParams();
    if (params.startDate) search.set("startDate", params.startDate);
    if (params.endDate) search.set("endDate", params.endDate);
    if (typeof params.limit === "number") {
      search.set("limit", String(params.limit));
    }

    const qs = search.toString();
    const url = `${API_BASE_URL}/api/locations/bus/${busId}/history${
      qs ? `?${qs}` : ""
    }`;

    const res = await fetch(url, {
      method: "GET",
      headers: getHeaders(accessToken),
      credentials: "include",
    });

    if (!res.ok) {
      const err = await parseJson<any>(res);
      throw new Error(err.message || "Failed to fetch location history");
    }

    const body = await parseJson<ApiEnvelope<BusLocation[] | BusLocation>>(res);
    const data = (body as any).data ?? body;

    const normalize = (raw: any): BusLocation => {
      const latitude = Number(raw.latitude);
      const longitude = Number(raw.longitude);

      return {
        ...raw,
        latitude,
        longitude,
        speed:
          raw.speed !== undefined && raw.speed !== null
            ? Number(raw.speed)
            : null,
      } as BusLocation;
    };

    if (Array.isArray(data)) {
      return data.map(normalize);
    }

    return [normalize(data)];
  },
};