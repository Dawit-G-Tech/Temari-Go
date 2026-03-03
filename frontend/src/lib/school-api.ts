const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface School {
  id: number;
  name: string;
  address?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSchoolInput {
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface UpdateSchoolInput {
  name?: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
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

export const schoolAPI = {
  async getAll(accessToken?: string): Promise<School[]> {
    const response = await fetch(`${API_BASE_URL}/api/schools`, {
      method: "GET",
      headers: getHeaders(accessToken),
      credentials: "include",
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Failed to fetch schools");
    }

    const result = await response.json();
    return result.data ?? result;
  },

  async create(
    input: CreateSchoolInput,
    accessToken?: string,
  ): Promise<School> {
    const response = await fetch(`${API_BASE_URL}/api/schools`, {
      method: "POST",
      headers: getHeaders(accessToken),
      credentials: "include",
      body: JSON.stringify({
        name: input.name,
        address: input.address ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Failed to create school");
    }

    const result = await response.json();
    return result.data ?? result;
  },

  async update(
    id: number,
    input: UpdateSchoolInput,
    accessToken?: string,
  ): Promise<School> {
    const response = await fetch(`${API_BASE_URL}/api/schools/${id}`, {
      method: "PUT",
      headers: getHeaders(accessToken),
      credentials: "include",
      body: JSON.stringify({
        name: input.name,
        address: input.address,
        latitude: input.latitude,
        longitude: input.longitude,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Failed to update school");
    }

    const result = await response.json();
    return result.data ?? result;
  },

  async delete(id: number, accessToken?: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/schools/${id}`, {
      method: "DELETE",
      headers: getHeaders(accessToken),
      credentials: "include",
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Failed to delete school");
    }
  },
};

