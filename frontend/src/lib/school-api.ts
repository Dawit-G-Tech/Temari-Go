const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface School {
  id: number;
  name: string;
  address?: string | null;
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

export const schoolAPI = {
  async getAll(accessToken?: string): Promise<School[]> {
    const response = await fetch(`${API_BASE_URL}/api/schools`, {
      method: 'GET',
      headers: getHeaders(accessToken),
      credentials: 'include',
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch schools');
    }

    const result = await response.json();
    return result.data ?? result;
  },
};

