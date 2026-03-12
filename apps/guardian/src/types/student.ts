export type StudentListItem = {
  id: string;
  full_name?: string | null;
  grade?: string | number | null;
  parent_id?: string | null;
  busId?: string | null;
  home_latitude?: number | null;
  home_longitude?: number | null;
  [key: string]: unknown;
};

export type StudentDetailResponse = {
  student: Record<string, unknown>;
  attendanceSummary?: Record<string, unknown>;
  latestPaymentStatus?: Record<string, unknown>;
};

