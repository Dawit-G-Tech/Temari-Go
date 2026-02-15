const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export type InvoiceStatus = "pending" | "paid" | "overdue" | "cancelled";

export interface InvoiceStudent {
  id: number;
  full_name: string;
  grade?: string | null;
}

export interface InvoiceParent {
  id: number;
  name: string;
  email: string;
}

export interface Invoice {
  id: number;
  parent_id: number;
  student_id: number;
  amount: number;
  due_date: string;
  period_label: string;
  status: InvoiceStatus;
  payment_id?: number | null;
  student?: InvoiceStudent;
  parent?: InvoiceParent;
}

export interface InvoiceListResult {
  invoices: Invoice[];
  total: number;
  limit: number;
  offset: number;
}

export interface InvoiceBulkItem {
  parent_id: number;
  student_id: number;
  amount: number;
  due_date: string;
  period_label: string;
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

async function parseJson<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  return json as T;
}

export const invoiceAPI = {
  /**
   * List invoices. As admin: all with filters. As parent: own only.
   */
  async list(
    options: {
      status?: InvoiceStatus;
      parentId?: number;
      studentId?: number;
      dueFrom?: string;
      dueTo?: string;
      limit?: number;
      offset?: number;
      accessToken?: string;
    } = {}
  ): Promise<InvoiceListResult> {
    const search = new URLSearchParams();
    if (options.status) search.set("status", options.status);
    if (options.parentId != null) search.set("parentId", String(options.parentId));
    if (options.studentId != null) search.set("studentId", String(options.studentId));
    if (options.dueFrom) search.set("dueFrom", options.dueFrom);
    if (options.dueTo) search.set("dueTo", options.dueTo);
    if (typeof options.limit === "number") search.set("limit", String(options.limit));
    if (typeof options.offset === "number") search.set("offset", String(options.offset));

    const qs = search.toString();
    const url = `${API_BASE_URL}/api/invoices${qs ? `?${qs}` : ""}`;

    const res = await fetch(url, {
      method: "GET",
      headers: getHeaders(options.accessToken),
      credentials: "include",
    });

    if (!res.ok) {
      const err = await parseJson<{ message?: string }>(res);
      throw new Error(err.message || "Failed to fetch invoices");
    }

    const body = await parseJson<{
      success: boolean;
      data: Invoice[];
      pagination?: { total: number; limit: number; offset: number };
    }>(res);
    const invoices = Array.isArray(body.data) ? body.data : [];
    const pagination = body.pagination;

    return {
      invoices,
      total: pagination?.total ?? invoices.length,
      limit: pagination?.limit ?? invoices.length,
      offset: pagination?.offset ?? 0,
    };
  },

  /**
   * Create bulk invoices (admin only).
   * skipDuplicates: do not create another invoice for same parent+student+period_label.
   */
  async createBulk(
    items: InvoiceBulkItem[],
    options: { notifyParent?: boolean; skipDuplicates?: boolean; accessToken?: string } = {}
  ): Promise<{ created: number; errors: string[] }> {
    const url = `${API_BASE_URL}/api/invoices/bulk`;

    const res = await fetch(url, {
      method: "POST",
      headers: getHeaders(options.accessToken),
      credentials: "include",
      body: JSON.stringify({
        items,
        notifyParent: options.notifyParent ?? false,
        skipDuplicates: options.skipDuplicates ?? false,
      }),
    });

    if (!res.ok) {
      const err = await parseJson<{ message?: string }>(res);
      throw new Error(err.message || "Failed to create invoices");
    }

    const body = await parseJson<{
      success: boolean;
      data: { created: number; errors: string[] };
    }>(res);
    return body.data;
  },
};
