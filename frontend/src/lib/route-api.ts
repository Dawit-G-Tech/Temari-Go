// Route & route directions API client
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

import type { Bus } from './bus-api';
import type { Student } from './student-api';

export interface RouteAssignmentStudent extends Pick<Student, 'id' | 'full_name' | 'grade' | 'home_latitude' | 'home_longitude'> {}

export interface RouteAssignment {
  id: number;
  route_id: number;
  student_id: number;
  pickup_latitude?: number | string | null;
  pickup_longitude?: number | string | null;
  pickup_order?: number | null;
  student?: RouteAssignmentStudent | null;
}

export interface Route {
  id: number;
  bus_id: number;
  name: string;
  start_time?: string | null;
  end_time?: string | null;
  bus?: Pick<Bus, 'id' | 'bus_number' | 'capacity'> | null;
  routeAssignments?: RouteAssignment[];
}

export interface CreateRouteInput {
  bus_id: number;
  name: string;
  start_time?: string | null;
  end_time?: string | null;
}

export interface UpdateRouteInput {
  bus_id?: number;
  name?: string;
  start_time?: string | null;
  end_time?: string | null;
}

export interface RouteFilters {
  bus_id?: number;
}

export interface OptimizeRouteOptions {
  zone_radius_km?: number;
}

export interface RouteOptimizeResult {
  route: Route;
  // Any additional metadata from backend is left loosely typed
  [key: string]: unknown;
}

export interface RouteDirectionsResult {
  // Backend returns either directions or just waypoints; keep this flexible.
  directions?: unknown;
  waypoints?: {
    lat: number;
    lng: number;
    label?: string;
  }[];
  summary?: string;
  [key: string]: unknown;
}

function getHeaders(accessToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  return headers;
}

export const routeAPI = {
  async getAll(accessToken?: string, filters?: RouteFilters): Promise<Route[]> {
    const params = new URLSearchParams();
    if (filters?.bus_id) params.append('bus_id', String(filters.bus_id));

    const url = `${API_BASE_URL}/api/routes${
      params.toString() ? `?${params.toString()}` : ''
    }`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(accessToken),
      credentials: 'include',
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch routes');
    }

    const result = await response.json();
    return result.data ?? result;
  },

  async getById(id: number, accessToken?: string): Promise<Route> {
    const response = await fetch(`${API_BASE_URL}/api/routes/${id}`, {
      method: 'GET',
      headers: getHeaders(accessToken),
      credentials: 'include',
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch route');
    }

    const result = await response.json();
    return result.data ?? result;
  },

  async create(input: CreateRouteInput, accessToken?: string): Promise<Route> {
    const response = await fetch(`${API_BASE_URL}/api/routes`, {
      method: 'POST',
      headers: getHeaders(accessToken),
      credentials: 'include',
      body: JSON.stringify({
        bus_id: input.bus_id,
        name: input.name,
        start_time: input.start_time ?? undefined,
        end_time: input.end_time ?? undefined,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create route');
    }

    const result = await response.json();
    return result.data ?? result;
  },

  async update(
    id: number,
    input: UpdateRouteInput,
    accessToken?: string,
  ): Promise<Route> {
    const response = await fetch(`${API_BASE_URL}/api/routes/${id}`, {
      method: 'PUT',
      headers: getHeaders(accessToken),
      credentials: 'include',
      body: JSON.stringify({
        bus_id: input.bus_id,
        name: input.name,
        start_time: input.start_time,
        end_time: input.end_time,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update route');
    }

    const result = await response.json();
    return result.data ?? result;
  },

  async delete(id: number, accessToken?: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/routes/${id}`, {
      method: 'DELETE',
      headers: getHeaders(accessToken),
      credentials: 'include',
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete route');
    }
  },

  async optimize(
    id: number,
    options: OptimizeRouteOptions,
    accessToken?: string,
  ): Promise<RouteOptimizeResult> {
    const response = await fetch(`${API_BASE_URL}/api/routes/${id}/optimize`, {
      method: 'POST',
      headers: getHeaders(accessToken),
      credentials: 'include',
      body: JSON.stringify({
        zone_radius_km: options.zone_radius_km ?? undefined,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to optimize route');
    }

    const result = await response.json();
    return result.data ?? result;
  },

  async getDirections(
    id: number,
    params: {
      origin_lat?: number;
      origin_lng?: number;
      destination_lat?: number;
      destination_lng?: number;
    } = {},
    accessToken?: string,
  ): Promise<RouteDirectionsResult> {
    const search = new URLSearchParams();
    if (params.origin_lat != null && params.origin_lng != null) {
      search.append('origin_lat', String(params.origin_lat));
      search.append('origin_lng', String(params.origin_lng));
    }
    if (params.destination_lat != null && params.destination_lng != null) {
      search.append('destination_lat', String(params.destination_lat));
      search.append('destination_lng', String(params.destination_lng));
    }

    const url = `${API_BASE_URL}/api/routes/${id}/directions${
      search.toString() ? `?${search.toString()}` : ''
    }`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(accessToken),
      credentials: 'include',
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch route directions');
    }

    const result = await response.json();
    return result.data ?? result;
  },
};

