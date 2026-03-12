import { useMutation } from '@tanstack/react-query';

import * as feedbackApi from '@/src/api/feedback';
import type { DriverFeedbackRequest } from '@/src/types/feedback';

export function useDriverFeedbackCreate() {
  return useMutation({
    mutationFn: (body: DriverFeedbackRequest) => feedbackApi.createDriverFeedback(body),
  });
}

