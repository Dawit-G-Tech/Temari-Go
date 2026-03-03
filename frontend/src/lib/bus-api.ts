// Bus API client for admin CRUD operations
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface BusDriver {
  id: number;
  name: string;
  email: string;
}

export interface BusSchool {
  id: number;
  name: string;
}

export interface BusRoute {
  id: number;
  name: string;
  start_time?: string | null;
  end_time?: string | null;
}

export interface Bus {
  id: number;
  bus_number: string;
  capacity?: number | null;
  driver_id?: number | null;
  school_id?: number | null;
  driver?: BusDriver | null;
  school?: BusSchool | null;
  routes?: BusRoute[];
}

export interface CreateBusInput {
  bus_number: string;
  capacity?: number | null;
  driver_id?: number | null;
  school_id?: number | null;
}

export interface UpdateBusInput {
  bus_number?: string;
  capacity?: number | null;
  driver_id?: number | null;
  school_id?: number | null;
}

export interface BusFilters {
  search?: string;
  status?: 'assigned' | 'unassigned';
  schoolId?: number;
  page?: number;
  pageSize?: number;
}

export interface BusListResponse {
  items: Bus[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
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

export const busAPI = {
  /**
   * Get all buses (admin only), with optional filters & pagination.
   */
  async getAll(
    accessToken?: string,
    filters?: BusFilters
  ): Promise<BusListResponse> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.schoolId) params.append('schoolId', String(filters.schoolId));
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.pageSize) params.append('pageSize', String(filters.pageSize));

    const url = `${API_BASE_URL}/api/buses${
      params.toString() ? `?${params.toString()}` : ''
    }`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(accessToken),
      credentials: 'include',
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch buses');
    }

    const result = await response.json();
    const items: Bus[] = result.data ?? result;
    const meta = result.meta ?? {
      total: items.length,
      page: filters?.page ?? 1,
      pageSize: filters?.pageSize ?? items.length,
      totalPages: 1,
    };

    return { items, meta };
  },

  /**
   * Get single bus by ID (admin only).
   */
  async getById(id: number, accessToken?: string): Promise<Bus> {
    const response = await fetch(`${API_BASE_URL}/api/buses/${id}`, {
      method: 'GET',
      headers: getHeaders(accessToken),
      credentials: 'include',
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch bus');
    }

    const result = await response.json();
    return result.data ?? result;
  },

  /**
   * Create a new bus (admin only).
   */
  async create(input: CreateBusInput, accessToken?: string): Promise<Bus> {
    const response = await fetch(`${API_BASE_URL}/api/buses`, {
      method: 'POST',
      headers: getHeaders(accessToken),
      credentials: 'include',
      body: JSON.stringify({
        bus_number: input.bus_number,
        capacity: input.capacity ?? undefined,
        driver_id: input.driver_id ?? undefined,
        school_id: input.school_id ?? undefined,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create bus');
    }

    const result = await response.json();
    return result.data ?? result;
  },

  /**
   * Update an existing bus (admin only).
   */
  async update(
    id: number,
    input: UpdateBusInput,
    accessToken?: string
  ): Promise<Bus> {
    const response = await fetch(`${API_BASE_URL}/api/buses/${id}`, {
      method: 'PUT',
      headers: getHeaders(accessToken),
      credentials: 'include',
      body: JSON.stringify({
        bus_number: input.bus_number,
        capacity: input.capacity ?? undefined,
        driver_id: input.driver_id ?? undefined,
        school_id: input.school_id ?? undefined,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update bus');
    }

    const result = await response.json();
    return result.data ?? result;
  },

  /**
   * Delete a bus (admin only).
   */
  async delete(id: number, accessToken?: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/buses/${id}`, {
      method: 'DELETE',
      headers: getHeaders(accessToken),
      credentials: 'include',
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete bus');
    }
  },

  /**
   * Assign a driver to a bus (admin only).
   */
  async assignDriver(
    id: number,
    driverId: number,
    accessToken?: string
  ): Promise<Bus> {
    const response = await fetch(`${API_BASE_URL}/api/buses/${id}/assign-driver`, {
      method: 'PUT',
      headers: getHeaders(accessToken),
      credentials: 'include',
      body: JSON.stringify({ driver_id: driverId }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to assign driver');
    }

    const result = await response.json();
    return result.data ?? result;
  },
};

