const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface PaymentStudent {
  id: number;
  full_name: string;
  grade?: string | null;
}

export interface Payment {
  id: number;
  parent_id: number;
  student_id: number;
  amount: number;
  status: "pending" | "completed" | "failed";
  chapa_transaction_id?: string | null;
  payment_method?: string | null;
  timestamp: string;
  student?: PaymentStudent;
}

export interface PaymentListResult {
  payments: Payment[];
  total: number;
  limit: number;
  offset: number;
}

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
  };
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

export const paymentAPI = {
  async initializePayment(input: {
    parent_id: number;
    student_id: number;
    amount: number;
    email: string;
    first_name?: string;
    last_name?: string;
    currency?: string;
    accessToken?: string;
  }): Promise<{ checkout_url: string; tx_ref: string; payment_id: number }> {
    const url = `${API_BASE_URL}/api/payment/pay`;

    const res = await fetch(url, {
      method: "POST",
      headers: getHeaders(input.accessToken),
      credentials: "include",
      body: JSON.stringify({
        parent_id: input.parent_id,
        student_id: input.student_id,
        amount: input.amount,
        email: input.email,
        first_name: input.first_name,
        last_name: input.last_name,
        currency: input.currency,
      }),
    });

    if (!res.ok) {
      const err = await parseJson<any>(res);
      throw new Error(
        err.message || "Failed to initialize payment with the gateway"
      );
    }

    const body = await parseJson<{
      success: boolean;
      data: { checkout_url: string; tx_ref: string; payment_id: number };
    }>(res);

    return body.data;
  },

  async listForParent(
    parentId: number,
    options: {
      status?: "pending" | "completed" | "failed";
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
      accessToken?: string;
    } = {}
  ): Promise<PaymentListResult> {
    const search = new URLSearchParams();
    if (options.status) search.set("status", options.status);
    if (options.startDate) search.set("startDate", options.startDate);
    if (options.endDate) search.set("endDate", options.endDate);
    if (typeof options.limit === "number")
      search.set("limit", String(options.limit));
    if (typeof options.offset === "number")
      search.set("offset", String(options.offset));

    const qs = search.toString();
    const url = `${API_BASE_URL}/api/payments/parent/${parentId}${
      qs ? `?${qs}` : ""
    }`;

    const res = await fetch(url, {
      method: "GET",
      headers: getHeaders(options.accessToken),
      credentials: "include",
    });

    if (!res.ok) {
      const err = await parseJson<any>(res);
      throw new Error(err.message || "Failed to fetch payments");
    }

    const body = await parseJson<ApiEnvelope<Payment[]>>(res);
    const data = (body as any).data ?? body;
    const pagination = (body as any).pagination;

    const items = (Array.isArray(data) ? data : []) as Payment[];

    return {
      payments: items,
      total: pagination?.total ?? items.length,
      limit: pagination?.limit ?? items.length,
      offset: pagination?.offset ?? 0,
    };
  },
};

