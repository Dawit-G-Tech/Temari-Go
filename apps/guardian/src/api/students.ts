import { request } from '@/src/api/http';
import type { StudentDetailResponse, StudentListItem } from '@/src/types/student';
import type { ApiEnvelope } from '@/src/api/envelope';
import { unwrapData } from '@/src/api/envelope';

export async function listStudents(query?: { grade?: string | number; busId?: string }): Promise<StudentListItem[]> {
  const res = await request<ApiEnvelope<StudentListItem[]>>('GET', '/students', { auth: true, query });
  return unwrapData(res);
}

export async function getStudent(id: string): Promise<StudentDetailResponse> {
  const res = await request<ApiEnvelope<StudentDetailResponse>>('GET', `/students/${encodeURIComponent(id)}`, {
    auth: true,
  });
  return unwrapData(res);
}

