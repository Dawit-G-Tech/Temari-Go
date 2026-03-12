import { request } from '@/src/api/http';
import type { NotificationListResponse } from '@/src/types/notification';
import type { ApiEnvelope } from '@/src/api/envelope';
import { unwrapData } from '@/src/api/envelope';

export async function listNotifications(query?: {
  type?: string;
  startDate?: string;
  endDate?: string;
  read?: boolean | 0 | 1 | 'true' | 'false';
  limit?: number;
  offset?: number;
}): Promise<NotificationListResponse> {
  const res = await request<ApiEnvelope<NotificationListResponse['data']>>('GET', '/notifications', { auth: true, query });
  return { data: res.data, pagination: res.pagination };
}

export async function markRead(id: string): Promise<unknown> {
  const res = await request<ApiEnvelope<unknown>>('PUT', `/notifications/${encodeURIComponent(id)}/read`, { auth: true });
  return unwrapData(res);
}

