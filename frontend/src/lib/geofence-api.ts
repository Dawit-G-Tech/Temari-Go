// Geofence API client for admin geofence management and driver read access
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export type GeofenceType = "school" | "home";

export interface GeofenceStudent {
  id: number;
  full_name: string;
}

export interface GeofenceBus {
  id: number;
  bus_number: string;
}

export interface GeofenceSchool {
  id: number;
  name: string;
}

export interface Geofence {
  id: number;
  name: string;
  type: GeofenceType;
  latitude: number | string;
  longitude: number | string;
  radius_meters: number;
  student_id?: number | null;
  bus_id?: number | null;
  school_id?: number | null;
  student?: GeofenceStudent | null;
  bus?: GeofenceBus | null;
  school?: GeofenceSchool | null;
}

export interface CreateGeofenceInput {
  name: string;
  type: GeofenceType;
  latitude?: number;
  longitude?: number;
  radius_meters?: number;
  student_id?: number | null;
  bus_id?: number | null;
  school_id?: number | null;
}

export interface UpdateGeofenceInput {
  name?: string;
  type?: GeofenceType;
  latitude?: number;
  longitude?: number;
  radius_meters?: number;
  student_id?: number | null;
  bus_id?: number | null;
  school_id?: number | null;
}

export interface GeofenceFilters {
  type?: GeofenceType;
  bus_id?: number;
  student_id?: number;
  school_id?: number;
}

function getHeaders(accessToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }
  return headers;
}

export const geofenceAPI = {
  /**
   * List geofences with optional filters.
   * Admins see all, drivers see those relevant to their bus, others per backend rules.
   */
  async getAll(
    accessToken?: string,
    filters?: GeofenceFilters
  ): Promise<Geofence[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.append("type", filters.type);
    if (filters?.bus_id != null) params.append("bus_id", String(filters.bus_id));
    if (filters?.student_id != null) {
      params.append("student_id", String(filters.student_id));
    }
    if (filters?.school_id != null) {
      params.append("school_id", String(filters.school_id));
    }

    const qs = params.toString();
    const url = qs
      ? `${API_BASE_URL}/api/geofences?${qs}`
      : `${API_BASE_URL}/api/geofences`;

    const response = await fetch(url, {
      method: "GET",
      headers: getHeaders(accessToken),
      credentials: "include",
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Failed to fetch geofences");
    }

    const result = await response.json();
    return result.data ?? result;
  },

  /**
   * Get a single geofence by ID.
   */
  async getById(id: number, accessToken?: string): Promise<Geofence> {
    const response = await fetch(`${API_BASE_URL}/api/geofences/${id}`, {
      method: "GET",
      headers: getHeaders(accessToken),
      credentials: "include",
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Failed to fetch geofence");
    }

    const result = await response.json();
    return result.data ?? result;
  },

  /**
   * Create a new geofence (admin only).
   */
  async create(
    input: CreateGeofenceInput,
    accessToken?: string
  ): Promise<Geofence> {
    const response = await fetch(`${API_BASE_URL}/api/geofences`, {
      method: "POST",
      headers: getHeaders(accessToken),
      credentials: "include",
      body: JSON.stringify({
        name: input.name,
        type: input.type,
        latitude: input.latitude,
        longitude: input.longitude,
        radius_meters: input.radius_meters ?? undefined,
        student_id:
          input.student_id === null ? null : input.student_id ?? undefined,
        bus_id: input.bus_id === null ? null : input.bus_id ?? undefined,
        school_id:
          input.school_id === null ? null : input.school_id ?? undefined,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Failed to create geofence");
    }

    const result = await response.json();
    return result.data ?? result;
  },

  /**
   * Update an existing geofence (admin only).
   */
  async update(
    id: number,
    input: UpdateGeofenceInput,
    accessToken?: string
  ): Promise<Geofence> {
    const response = await fetch(`${API_BASE_URL}/api/geofences/${id}`, {
      method: "PUT",
      headers: getHeaders(accessToken),
      credentials: "include",
      body: JSON.stringify({
        name: input.name,
        type: input.type,
        latitude: input.latitude,
        longitude: input.longitude,
        radius_meters: input.radius_meters,
        student_id:
          input.student_id === null
            ? null
            : input.student_id !== undefined
            ? input.student_id
            : undefined,
        bus_id:
          input.bus_id === null
            ? null
            : input.bus_id !== undefined
            ? input.bus_id
            : undefined,
        school_id:
          input.school_id === null
            ? null
            : input.school_id !== undefined
            ? input.school_id
            : undefined,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Failed to update geofence");
    }

    const result = await response.json();
    return result.data ?? result;
  },

  /**
   * Delete a geofence (admin only).
   */
  async delete(id: number, accessToken?: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/geofences/${id}`, {
      method: "DELETE",
      headers: getHeaders(accessToken),
      credentials: "include",
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Failed to delete geofence");
    }
  },
};

