import { QueryClient } from '@tanstack/react-query';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error: any) => {
          // Avoid hammering auth errors
          const status = error?.status;
          if (status === 401 || status === 403) return false;
          return failureCount < 2;
        },
        staleTime: 15_000,
        gcTime: 5 * 60_000,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

