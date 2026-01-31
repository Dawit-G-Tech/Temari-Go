// Attendance API client
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface AttendanceRecord {
  id: number;
  student_id: number;
  bus_id: number;
  rfid_card_id?: number;
  type: 'boarding' | 'exiting';
  timestamp: string;
  latitude?: number;
  longitude?: number;
  geofence_id?: number;
  manual_override: boolean;
  student?: {
    id: number;
    full_name: string;
    grade?: string;
  };
  bus?: {
    id: number;
    bus_number: string;
  };
  geofence?: {
    id: number;
    name: string;
    type: 'school' | 'home';
  };
}

export interface AttendanceScanInput {
  rfid_tag: string;
  timestamp?: string;
  latitude: number;
  longitude: number;
  vehicle_id?: string;
  bus_id?: number;
}

export interface AttendanceScanResponse {
  success: boolean;
  data: {
    success: boolean;
    attendanceType: 'boarding' | 'exiting';
    studentId: number;
    studentName: string;
    geofenceId?: number;
    geofenceName?: string;
    message: string;
  };
  message: string;
}

export interface BusAttendanceResponse {
  success: boolean;
  data: {
    onboardCount: number;
    onboardStudents: number[];
    attendances: AttendanceRecord[];
  };
}

export interface AttendanceFilters {
  studentId?: number;
  busId?: number;
  startDate?: string;
  endDate?: string;
  type?: 'boarding' | 'exiting';
  limit?: number;
  offset?: number;
}

export interface AttendanceListResponse {
  success: boolean;
  data: {
    total: number;
    attendances: AttendanceRecord[];
  };
}

export interface Student {
  id: number;
  full_name: string;
  grade?: string;
  parent_id: number;
}

export interface Bus {
  id: number;
  bus_number: string;
  capacity?: number;
  driver_id?: number;
}

export const attendanceAPI = {
  /**
   * Get all attendance records with filters
   */
  async getAllAttendance(
    accessToken?: string,
    filters?: AttendanceFilters
  ): Promise<AttendanceListResponse> {
    const params = new URLSearchParams();
    if (filters?.studentId) params.append('studentId', filters.studentId.toString());
    if (filters?.busId) params.append('busId', filters.busId.toString());
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const url = `${API_BASE_URL}/api/attendance${params.toString() ? `?${params.toString()}` : ''}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Use Authorization header if token provided, otherwise rely on cookies
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include', // Include cookies
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch attendance');
    }

    return await response.json();
  },

  /**
   * Get all students
   */
  async getStudents(accessToken?: string): Promise<Student[]> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    const response = await fetch(`${API_BASE_URL}/api/students`, {
      method: 'GET',
      headers,
      credentials: 'include', // Include cookies
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch students');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * Get all buses
   */
  async getBuses(accessToken?: string): Promise<Bus[]> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    const response = await fetch(`${API_BASE_URL}/api/buses`, {
      method: 'GET',
      headers,
      credentials: 'include', // Include cookies
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch buses');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * Get attendance history for a student
   */
  async getStudentAttendance(
    studentId: number,
    accessToken: string,
    startDate?: string,
    endDate?: string
  ): Promise<AttendanceRecord[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const url = `${API_BASE_URL}/api/attendance/student/${studentId}${params.toString() ? `?${params.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch attendance');
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * Get bus attendance summary
   */
  async getBusAttendance(
    busId: number,
    accessToken: string,
    date?: string
  ): Promise<BusAttendanceResponse> {
    const params = new URLSearchParams();
    if (date) params.append('date', date);

    const url = `${API_BASE_URL}/api/attendance/bus/${busId}${params.toString() ? `?${params.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch bus attendance');
    }

    return await response.json();
  },
};

