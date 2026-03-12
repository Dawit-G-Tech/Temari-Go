import { request } from '@/src/api/http';
import type { RegisterFcmTokenRequest, UpdateMeRequest, UserMe } from '@/src/types/user';
import type { ApiEnvelope } from '@/src/api/envelope';
import { unwrapData } from '@/src/api/envelope';

export async function getMe(): Promise<UserMe> {
  const res = await request<ApiEnvelope<UserMe>>('GET', '/user/me', { auth: true });
  return unwrapData(res);
}

export async function updateMe(body: UpdateMeRequest): Promise<UserMe> {
  const res = await request<ApiEnvelope<UserMe>>('PUT', '/user/me', { auth: true, body });
  return unwrapData(res);
}

export async function registerFcmToken(body: RegisterFcmTokenRequest): Promise<unknown> {
  const res = await request<ApiEnvelope<unknown>>('POST', '/user/fcm-token', { auth: true, body });
  return unwrapData(res);
}

