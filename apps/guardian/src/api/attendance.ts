import { request } from '@/src/api/http';
import type { AttendanceEvent } from '@/src/types/attendance';
import type { ApiEnvelope } from '@/src/api/envelope';
import { unwrapData } from '@/src/api/envelope';

export async function listAttendanceByStudent(
  studentId: string,
  query?: { startDate?: string; endDate?: string }
): Promise<AttendanceEvent[]> {
  const res = await request<ApiEnvelope<AttendanceEvent[]>>(
    'GET',
    `/attendance/student/${encodeURIComponent(studentId)}`,
    { auth: true, query }
  );
  return unwrapData(res);
}

