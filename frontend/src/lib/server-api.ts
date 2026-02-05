// Server-side API utilities for Next.js Server Components
import { cookies } from 'next/headers';
import { API_BASE_URL, type User } from './auth';

export interface ServerApiOptions {
  cache?: RequestCache;
  next?: { revalidate?: number };
}

/**
 * Get access token from cookies (for server-side requests)
 */
export async function getServerAccessToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    return accessToken || null;
  } catch (error) {
    // Cookies might not be available in some contexts
    return null;
  }
}

/**
 * Make authenticated API request from server component
 */
export async function serverFetch<T>(
  endpoint: string,
  options: RequestInit & ServerApiOptions = {}
): Promise<T> {
  const { cache, next, ...fetchOptions } = options;
  const accessToken = await getServerAccessToken();

  if (!accessToken) {
    throw new Error('No access token available');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
    cache,
    next,
    // Include cookies in server-to-server requests
    credentials: 'include',
  });

  if (!response.ok) {
    // Don't throw for 401 - just means user isn't authenticated
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  const result = await response.json();
  return result.data || result;
}

/**
 * Get all students (server-side)
 */
export async function getServerStudents() {
  try {
    return await serverFetch('/api/students', {
      cache: 'no-store', // Always fetch fresh data
    });
  } catch (error) {
    console.error('Failed to fetch students on server:', error);
    return [];
  }
}

import type { Bus } from './bus-api';

/**
 * Get all buses (server-side)
 *
 * This is intentionally more forgiving than `serverFetch`:
 * - If there is no access token, it just returns an empty array instead of throwing.
 * - If the request fails or returns 401, it also returns an empty array.
 * The client-side BusView will then load data using the browser auth token.
 */
export async function getServerBuses(): Promise<Bus[]> {
  try {
    const accessToken = await getServerAccessToken();
    if (!accessToken) {
      return [];
    }

    const response = await fetch(`${API_BASE_URL}/api/buses`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      credentials: 'include',
    });

    if (!response.ok) {
      // Silently fall back to client-side fetching
      return [];
    }

    const result = await response.json();
    return result.data ?? result;
  } catch (error) {
    console.error('Failed to fetch buses on server:', error);
    return [];
  }
}

/**
 * Get attendance records (server-side)
 */
export async function getServerAttendance(filters?: {
  studentId?: number;
  busId?: number;
  startDate?: string;
  endDate?: string;
  type?: 'boarding' | 'exiting';
  limit?: number;
  offset?: number;
}) {
  try {
    const params = new URLSearchParams();
    if (filters?.studentId) params.append('studentId', filters.studentId.toString());
    if (filters?.busId) params.append('busId', filters.busId.toString());
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const url = `/api/attendance${params.toString() ? `?${params.toString()}` : ''}`;
    return await serverFetch(url, {
      cache: 'no-store',
    });
  } catch (error) {
    console.error('Failed to fetch attendance on server:', error);
    return { total: 0, attendances: [] };
  }
}

/**
 * Get current user (server-side)
 */
export async function getServerUser(): Promise<User | null> {
  try {
    return await serverFetch<User>('/api/user/me', {
      cache: 'no-store',
    });
  } catch (error) {
    return null;
  }
}

