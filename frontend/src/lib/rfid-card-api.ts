const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface RFIDCard {
  id: number;
  rfid_tag: string;
  student_id: number;
  active: boolean;
  issued_at?: string;
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

export const rfidCardAPI = {
  async assign(
    payload: { rfid_tag: string; student_id: number },
    accessToken?: string
  ): Promise<RFIDCard> {
    const url = `${API_BASE_URL}/api/rfid-cards/assign`;
    const res = await fetch(url, {
      method: "POST",
      headers: getHeaders(accessToken),
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await parseJson<any>(res);
      throw new Error(err.message || "Failed to assign RFID card");
    }

    const body = await parseJson<ApiEnvelope<RFIDCard>>(res);
    return ((body as any).data ?? body) as RFIDCard;
  },

  async getActiveForStudent(
    studentId: number,
    accessToken?: string
  ): Promise<RFIDCard | null> {
    const url = `${API_BASE_URL}/api/rfid-cards/student/${studentId}`;
    const res = await fetch(url, {
      method: "GET",
      headers: getHeaders(accessToken),
      credentials: "include",
    });

    if (!res.ok) {
      const err = await parseJson<any>(res);
      throw new Error(err.message || "Failed to fetch RFID card");
    }

    const body = await parseJson<ApiEnvelope<RFIDCard | null>>(res);
    return ((body as any).data ?? body) as RFIDCard | null;
  },

  async deactivate(id: number, accessToken?: string): Promise<RFIDCard> {
    const url = `${API_BASE_URL}/api/rfid-cards/${id}/deactivate`;
    const res = await fetch(url, {
      method: "PUT",
      headers: getHeaders(accessToken),
      credentials: "include",
    });

    if (!res.ok) {
      const err = await parseJson<any>(res);
      throw new Error(err.message || "Failed to deactivate RFID card");
    }

    const body = await parseJson<ApiEnvelope<RFIDCard>>(res);
    return ((body as any).data ?? body) as RFIDCard;
  },
};

