import { constants } from '@/src/config/constants';

export function usePagination(params?: { limit?: number; offset?: number }) {
  const limit = params?.limit ?? constants.pagination.defaultLimit;
  const offset = params?.offset ?? 0;
  return { limit, offset };
}

