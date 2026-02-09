const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface Parent {
  id: number;
  name: string;
  email: string;
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

export const userAPI = {
  /** List all parents (admin only). Used for student form parent selector. */
  async getParents(accessToken?: string): Promise<Parent[]> {
    const response = await fetch(`${API_BASE_URL}/api/user/parents`, {
      method: "GET",
      headers: getHeaders(accessToken),
      credentials: "include",
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Failed to fetch parents");
    }
    const result = await response.json();
    return result.data ?? result;
  },
};
