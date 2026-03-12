import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as usersApi from '@/src/api/users';
import type { UpdateMeRequest, UserMe } from '@/src/types/user';

import { queryKeys } from './queryKeys';

export function useMe() {
  return useQuery<UserMe>({
    queryKey: queryKeys.me,
    queryFn: usersApi.getMe,
  });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMeRequest) => usersApi.updateMe(body),
    onSuccess: (me) => {
      qc.setQueryData(queryKeys.me, me);
    },
  });
}

