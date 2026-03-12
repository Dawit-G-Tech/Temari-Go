import { useQuery } from '@tanstack/react-query';

import * as studentsApi from '@/src/api/students';

import { queryKeys } from './queryKeys';

export function useStudentsList(filters?: { grade?: string | number; busId?: string }) {
  return useQuery({
    queryKey: queryKeys.students(filters),
    queryFn: () => studentsApi.listStudents(filters),
  });
}

export function useStudentDetail(id: string) {
  return useQuery({
    enabled: Boolean(id),
    queryKey: queryKeys.student(id),
    queryFn: () => studentsApi.getStudent(id),
  });
}

