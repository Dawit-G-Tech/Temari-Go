import { useQuery } from '@tanstack/react-query';

import * as locationsApi from '@/src/api/locations';

import { queryKeys } from './queryKeys';

export function useBusCurrent(busId: string, opts?: { refetchIntervalMs?: number }) {
  return useQuery({
    enabled: Boolean(busId),
    queryKey: queryKeys.busCurrent(busId),
    queryFn: () => locationsApi.getBusCurrent(busId),
    refetchInterval: opts?.refetchIntervalMs ?? 8_000,
  });
}

export function useBusHistory(busId: string, filters?: { startDate?: string; endDate?: string; limit?: number }) {
  return useQuery({
    enabled: Boolean(busId),
    queryKey: queryKeys.busHistory(busId, filters),
    queryFn: () => locationsApi.getBusHistory(busId, filters),
  });
}

