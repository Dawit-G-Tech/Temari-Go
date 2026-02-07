// Route assignment API client for assigning students to routes
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

import type { Student } from './student-api';

export interface RouteAssignmentStudent
  extends Pick<Student, 'id' | 'full_name' | 'grade' | 'home_latitude' | 'home_longitude'> {}

export interface RouteAssignment {
  id: number;
  route_id: number;
  student_id: number;
  pickup_latitude?: number | string | null;
  pickup_longitude?: number | string | null;
  pickup_order?: number | null;
  student?: RouteAssignmentStudent | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRouteAssignmentInput {
  route_id: number;
  student_id: number;
  pickup_latitude?: number | null;
  pickup_longitude?: number | null;
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

export const routeAssignmentAPI = {
  async getByRouteId(
    routeId: number,
    accessToken?: string,
  ): Promise<RouteAssignment[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/route-assignments/route/${routeId}`,
      {
        method: 'GET',
        headers: getHeaders(accessToken),
        credentials: 'include',
      },
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch route assignments');
    }

    const result = await response.json();
    return result.data ?? result;
  },

  async create(
    input: CreateRouteAssignmentInput,
    accessToken?: string,
  ): Promise<RouteAssignment> {
    const response = await fetch(`${API_BASE_URL}/api/route-assignments`, {
      method: 'POST',
      headers: getHeaders(accessToken),
      credentials: 'include',
      body: JSON.stringify({
        route_id: input.route_id,
        student_id: input.student_id,
        pickup_latitude: input.pickup_latitude ?? undefined,
        pickup_longitude: input.pickup_longitude ?? undefined,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create route assignment');
    }

    const result = await response.json();
    return result.data ?? result;
  },

  async delete(id: number, accessToken?: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/route-assignments/${id}`, {
      method: 'DELETE',
      headers: getHeaders(accessToken),
      credentials: 'include',
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete route assignment');
    }
  },
};

