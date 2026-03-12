import { request } from '@/src/api/http';
import type { DriverFeedbackRequest, DriverFeedbackResponse } from '@/src/types/feedback';
import type { ApiEnvelope } from '@/src/api/envelope';
import { unwrapData } from '@/src/api/envelope';

export async function createDriverFeedback(body: DriverFeedbackRequest): Promise<DriverFeedbackResponse> {
  const res = await request<ApiEnvelope<DriverFeedbackResponse>>('POST', '/driver-feedback', { auth: true, body });
  return unwrapData(res);
}

