export type AttendanceEventType = 'boarding' | 'exiting' | string;

export type AttendanceEvent = {
  id?: string;
  studentId?: string;
  busId?: string;
  type: AttendanceEventType;
  timestamp?: string;
  createdAt?: string;
  [key: string]: unknown;
};

