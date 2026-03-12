import { request } from '@/src/api/http';
import type { InvoiceListResponse, InvoiceStatus } from '@/src/types/billing';
import type { ApiEnvelope } from '@/src/api/envelope';

export async function listInvoices(query?: {
  status?: InvoiceStatus;
  studentId?: string;
  dueFrom?: string;
  dueTo?: string;
  limit?: number;
  offset?: number;
}): Promise<InvoiceListResponse> {
  const res = await request<ApiEnvelope<InvoiceListResponse['data']>>('GET', '/invoices', { auth: true, query });
  return {
    data: res.data,
    pagination: res.pagination,
  };
}

