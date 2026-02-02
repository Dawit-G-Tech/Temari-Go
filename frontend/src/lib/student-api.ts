// Student API client for admin CRUD operations
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface Student {
  id: number;
  full_name: string;
  grade?: string | null;
  parent_id: number;
  home_latitude?: number | string | null;
  home_longitude?: number | string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateStudentInput {
  full_name: string;
  grade?: string | null;
  parent_id: number;
  home_latitude?: number | null;
  home_longitude?: number | null;
}

export interface UpdateStudentInput {
  full_name?: string;
  grade?: string | null;
  parent_id?: number;
  home_latitude?: number | null;
  home_longitude?: number | null;
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

export const studentAPI = {
  /**
   * Get all students (admin: all; parent: own only).
   */
  async getAll(accessToken?: string): Promise<Student[]> {
    const response = await fetch(`${API_BASE_URL}/api/students`, {
      method: 'GET',
      headers: getHeaders(accessToken),
      credentials: 'include',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch students');
    }
    const result = await response.json();
    return result.data ?? result;
  },

  /**
   * Get student by ID.
   */
  async getById(id: number, accessToken?: string): Promise<Student> {
    const response = await fetch(`${API_BASE_URL}/api/students/${id}`, {
      method: 'GET',
      headers: getHeaders(accessToken),
      credentials: 'include',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch student');
    }
    const result = await response.json();
    return result.data ?? result;
  },

  /**
   * Create student (admin only).
   */
  async create(
    input: CreateStudentInput,
    accessToken?: string
  ): Promise<Student> {
    const response = await fetch(`${API_BASE_URL}/api/students`, {
      method: 'POST',
      headers: getHeaders(accessToken),
      credentials: 'include',
      body: JSON.stringify({
        full_name: input.full_name,
        grade: input.grade ?? null,
        parent_id: input.parent_id,
        home_latitude: input.home_latitude ?? null,
        home_longitude: input.home_longitude ?? null,
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create student');
    }
    const result = await response.json();
    return result.data ?? result;
  },

  /**
   * Update student (admin only).
   */
  async update(
    id: number,
    input: UpdateStudentInput,
    accessToken?: string
  ): Promise<Student> {
    const response = await fetch(`${API_BASE_URL}/api/students/${id}`, {
      method: 'PUT',
      headers: getHeaders(accessToken),
      credentials: 'include',
      body: JSON.stringify({
        full_name: input.full_name,
        grade: input.grade,
        parent_id: input.parent_id,
        home_latitude: input.home_latitude,
        home_longitude: input.home_longitude,
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update student');
    }
    const result = await response.json();
    return result.data ?? result;
  },

  /**
   * Delete student (admin only).
   */
  async delete(id: number, accessToken?: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/students/${id}`, {
      method: 'DELETE',
      headers: getHeaders(accessToken),
      credentials: 'include',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete student');
    }
  },
};
