import { request } from '@/src/api/http';
import type { PayInitRequest, PayInitResponse, PaymentListResponse, PaymentStatus } from '@/src/types/billing';
import type { ApiEnvelope } from '@/src/api/envelope';
import { unwrapData } from '@/src/api/envelope';

export async function listPaymentsByParent(
  parentId: string,
  query?: {
    status?: PaymentStatus;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }
): Promise<PaymentListResponse> {
  const res = await request<ApiEnvelope<PaymentListResponse['data']>>('GET', `/payments/parent/${encodeURIComponent(parentId)}`, {
    auth: true,
    query,
  });
  return { data: res.data, pagination: res.pagination };
}

export async function listPaymentsByStudent(
  studentId: string,
  query?: {
    status?: PaymentStatus;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }
): Promise<PaymentListResponse> {
  const res = await request<ApiEnvelope<PaymentListResponse['data']>>('GET', `/payments/student/${encodeURIComponent(studentId)}`, {
    auth: true,
    query,
  });
  return { data: res.data, pagination: res.pagination };
}

export async function initPay(body: PayInitRequest): Promise<PayInitResponse> {
  const res = await request<ApiEnvelope<PayInitResponse>>('POST', '/payment/pay', { auth: true, body });
  return unwrapData(res);
}

