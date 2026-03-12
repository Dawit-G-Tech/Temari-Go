import { useQuery } from '@tanstack/react-query';

import * as attendanceApi from '@/src/api/attendance';

import { queryKeys } from './queryKeys';

export function useAttendanceByStudent(studentId: string, filters?: { startDate?: string; endDate?: string }) {
  return useQuery({
    enabled: Boolean(studentId),
    queryKey: queryKeys.attendanceByStudent(studentId, filters),
    queryFn: () => attendanceApi.listAttendanceByStudent(studentId, filters),
  });
}

