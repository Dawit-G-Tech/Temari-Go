import { AttendanceView } from '@/modules/attendance/views/attendance-view';
import { getServerStudents, getServerBuses, getServerAttendance } from '@/lib/server-api';
import type { Student, Bus, AttendanceRecord } from '@/lib/attendance-api';

// Server Component - fetches initial data
export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  
  const params = await searchParams;
  
  // Extract filter params from URL
  const studentId = params.studentId ? Number(params.studentId) : undefined;
  const busId = params.busId ? Number(params.busId) : undefined;
  const type = params.type as 'boarding' | 'exiting' | undefined;
  const startDate = params.startDate as string | undefined;
  const endDate = params.endDate as string | undefined;

  // Fetch initial data on the server
  // This will work if cookies are available, otherwise will return empty arrays
  const [initialStudents, initialBuses, initialAttendance] = await Promise.all([
    getServerStudents().catch(() => []) as Promise<Student[]>,
    getServerBuses().catch(() => []) as Promise<Bus[]>,
    getServerAttendance({
      studentId,
      busId,
      type,
      startDate,
      endDate,
      limit: 100,
    }).catch(() => ({ total: 0, attendances: [] })) as Promise<{
      total: number;
      attendances: AttendanceRecord[];
    }>,
  ]);

  return (
    <AttendanceView
      initialStudents={initialStudents}
      initialBuses={initialBuses}
      initialAttendance={initialAttendance}
      initialFilters={{
        studentId,
        busId,
        type,
        startDate,
        endDate,
      }}
    />
  );
}
