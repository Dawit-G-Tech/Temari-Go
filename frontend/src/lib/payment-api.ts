const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface PaymentStudent {
  id: number;
  full_name: string;
  grade?: string | null;
}

export interface PaymentParent {
  id: number;
  name: string;
  email: string;
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
  parent?: PaymentParent;
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
    full_name?: string;
    first_name?: string;
    last_name?: string;
    currency?: string;
    accessToken?: string;
  }): Promise<{ checkout_url: string; tx_ref: string; payment_id: number }> {
    const url = `${API_BASE_URL}/api/payment/pay`;

    const body: Record<string, unknown> = {
      parent_id: input.parent_id,
      student_id: input.student_id,
      amount: input.amount,
      email: input.email,
      currency: input.currency,
    };
    if (input.full_name != null) body.full_name = input.full_name;
    else {
      if (input.first_name != null) body.first_name = input.first_name;
      if (input.last_name != null) body.last_name = input.last_name;
    }

    const res = await fetch(url, {
      method: "POST",
      headers: getHeaders(input.accessToken),
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await parseJson<any>(res);
      throw new Error(
        err.message || "Failed to initialize payment with the gateway"
      );
    }

    const result = await parseJson<{
      success: boolean;
      data: { checkout_url: string; tx_ref: string; payment_id: number };
    }>(res);

    return result.data;
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

  /**
   * List all payments (admin only). Use for payment ledger.
   */
  async listAllForAdmin(
    options: {
      status?: "pending" | "completed" | "failed";
      startDate?: string;
      endDate?: string;
      parentId?: number;
      studentId?: number;
      limit?: number;
      offset?: number;
      accessToken?: string;
    } = {}
  ): Promise<PaymentListResult> {
    const search = new URLSearchParams();
    if (options.status) search.set("status", options.status);
    if (options.startDate) search.set("startDate", options.startDate);
    if (options.endDate) search.set("endDate", options.endDate);
    if (options.parentId != null) search.set("parentId", String(options.parentId));
    if (options.studentId != null) search.set("studentId", String(options.studentId));
    if (typeof options.limit === "number")
      search.set("limit", String(options.limit));
    if (typeof options.offset === "number")
      search.set("offset", String(options.offset));

    const qs = search.toString();
    const url = `${API_BASE_URL}/api/payments${qs ? `?${qs}` : ""}`;

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

  /**
   * Update payment status (admin only).
   */
  async updatePaymentStatus(
    paymentId: number,
    status: "pending" | "completed" | "failed",
    accessToken?: string
  ): Promise<Payment> {
    const url = `${API_BASE_URL}/api/payments/${paymentId}/status`;

    const res = await fetch(url, {
      method: "PUT",
      headers: getHeaders(accessToken),
      credentials: "include",
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const err = await parseJson<any>(res);
      throw new Error(err.message || "Failed to update payment status");
    }

    const body = await parseJson<ApiEnvelope<Payment>>(res);
    return (body as any).data ?? body;
  },

  /**
   * Manually verify a payment with Chapa (admin/testing).
   */
  async verifyPayment(
    paymentId: number,
    accessToken?: string
  ): Promise<{ message: string }> {
    const url = `${API_BASE_URL}/api/payment/verify/${paymentId}`;

    const res = await fetch(url, {
      method: "GET",
      headers: getHeaders(accessToken),
      credentials: "include",
    });

    if (!res.ok) {
      const err = await parseJson<any>(res);
      throw new Error(err.message || "Failed to verify payment");
    }

    const body = await parseJson<{ message?: string }>(res);
    return { message: (body as any).message ?? "Verified" };
  },
};

