import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as notificationsApi from '@/src/api/notifications';

import { queryKeys } from './queryKeys';

export function useNotifications(filters?: {
  type?: string;
  startDate?: string;
  endDate?: string;
  read?: boolean | 0 | 1 | 'true' | 'false';
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: queryKeys.notifications(filters),
    queryFn: () => notificationsApi.listNotifications(filters),
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

