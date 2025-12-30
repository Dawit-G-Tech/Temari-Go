'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { authClient } from '@/lib/auth-client';
import { attendanceAPI, type AttendanceRecord, type Student, type Bus } from '@/lib/attendance-api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Clock, MapPin, User, Bus as BusIcon, CheckCircle, XCircle, Filter, RefreshCw } from 'lucide-react';

interface AttendanceViewProps {
  initialStudents?: Student[];
  initialBuses?: Bus[];
  initialAttendance?: {
    total: number;
    attendances: AttendanceRecord[];
  };
  initialFilters?: {
    studentId?: number;
    busId?: number;
    type?: 'boarding' | 'exiting';
    startDate?: string;
    endDate?: string;
  };
}

export const AttendanceView = ({
  initialStudents = [],
  initialBuses = [],
  initialAttendance = { total: 0, attendances: [] },
  initialFilters = {},
}: AttendanceViewProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  
  // Attendance data state - initialize with server data
  const [attendances, setAttendances] = useState<AttendanceRecord[]>(initialAttendance.attendances);
  const [totalCount, setTotalCount] = useState(initialAttendance.total);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state - initialize with server-provided filters or defaults
  const [selectedStudent, setSelectedStudent] = useState<string>(
    initialFilters.studentId?.toString() || ''
  );
  const [selectedBus, setSelectedBus] = useState<string>(
    initialFilters.busId?.toString() || ''
  );
  const [selectedType, setSelectedType] = useState<string>(
    initialFilters.type || ''
  );
  const [startDate, setStartDate] = useState(initialFilters.startDate || '');
  const [endDate, setEndDate] = useState(initialFilters.endDate || '');

  // Options for filters - initialize with server data
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [buses, setBuses] = useState<Bus[]>(initialBuses);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Load students and buses for filter options
  const loadFilterOptions = async () => {
    setLoadingOptions(true);
    try {
      // Try with token if available, otherwise use cookies
      const [studentsData, busesData] = await Promise.all([
        attendanceAPI.getStudents(accessToken || undefined),
        attendanceAPI.getBuses(accessToken || undefined),
      ]);
      setStudents(studentsData);
      setBuses(busesData);
    } catch (err: any) {
      console.error('Failed to load filter options:', err);
    } finally {
      setLoadingOptions(false);
    }
  };

  // Update URL when filters change (for SSR and sharing)
  const updateURL = (filters: {
    studentId?: string;
    busId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters.studentId) params.set('studentId', filters.studentId);
    if (filters.busId) params.set('busId', filters.busId);
    if (filters.type) params.set('type', filters.type);
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    
    const newUrl = params.toString() 
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    router.push(newUrl, { scroll: false });
  };

  // Load attendance records
  const loadAttendances = async (skipURLUpdate = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const filters: any = {};
      if (selectedStudent) filters.studentId = parseInt(selectedStudent);
      if (selectedBus) filters.busId = parseInt(selectedBus);
      if (selectedType) filters.type = selectedType;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      filters.limit = 100; // Limit to 100 records per page

      // Try with token if available, otherwise use cookies
      const result = await attendanceAPI.getAllAttendance(accessToken || undefined, filters);
      setAttendances(result.data.attendances);
      setTotalCount(result.data.total);

      // Update URL with current filters
      if (!skipURLUpdate) {
        updateURL({
          studentId: selectedStudent,
          busId: selectedBus,
          type: selectedType,
          startDate,
          endDate,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance records');
      setAttendances([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Load filter options only if not provided by server
  useEffect(() => {
    if (students.length === 0 || buses.length === 0) {
      loadFilterOptions();
    }
  }, []);

  // Reload attendance when filters change (but skip initial load if we have server data)
  useEffect(() => {
    // Only reload if we don't have initial data or filters changed
    const hasInitialData = initialAttendance.attendances.length > 0;
    const filtersChanged = 
      selectedStudent !== (initialFilters.studentId?.toString() || '') ||
      selectedBus !== (initialFilters.busId?.toString() || '') ||
      selectedType !== (initialFilters.type || '') ||
      startDate !== (initialFilters.startDate || '') ||
      endDate !== (initialFilters.endDate || '');

    if (!hasInitialData || filtersChanged) {
      loadAttendances();
    }
  }, [selectedStudent, selectedBus, selectedType, startDate, endDate]);

  const handleClearFilters = () => {
    setSelectedStudent('');
    setSelectedBus('');
    setSelectedType('');
    setStartDate('');
    setEndDate('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get access token from auth client
  useEffect(() => {
    const token = authClient.getAccessToken();
    setAccessToken(token);
  }, [user]);

  // Set default date range to today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (!startDate && !endDate) {
      setStartDate(today);
      setEndDate(today);
    }
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Attendance Records</h1>
          <p className="text-muted-foreground mt-1">
            View and filter student attendance records from the database
          </p>
        </div>
        <Button
          onClick={() => loadAttendances()}
          disabled={loading}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="student">Student</Label>
              <select
                id="student"
                className="w-full px-3 py-2 border rounded-md bg-background"
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                disabled={loadingOptions}
              >
                <option value="">All Students</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.full_name} {student.grade ? `(${student.grade})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bus">Bus</Label>
              <select
                id="bus"
                className="w-full px-3 py-2 border rounded-md bg-background"
                value={selectedBus}
                onChange={(e) => setSelectedBus(e.target.value)}
                disabled={loadingOptions}
              >
                <option value="">All Buses</option>
                {buses.map((bus) => (
                  <option key={bus.id} value={bus.id}>
                    {bus.bus_number}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                className="w-full px-3 py-2 border rounded-md bg-background"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="boarding">Boarding</option>
                <option value="exiting">Exiting</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-2 flex items-end">
              <Button
                onClick={handleClearFilters}
                variant="outline"
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert className="bg-red-50 border-red-200 text-red-800">
          {error}
        </Alert>
      )}

      {/* Attendance Records */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Attendance Records
            </h2>
            <div className="text-sm text-muted-foreground">
              {loading ? 'Loading...' : `Total: ${totalCount} records`}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading attendance records...
            </div>
          ) : attendances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No attendance records found.</p>
              <p className="text-sm mt-2">
                {totalCount === 0
                  ? 'No records match your filters. Try adjusting your search criteria.'
                  : 'Records are being processed by the microcontroller system.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {attendances.map((attendance) => (
                <div
                  key={attendance.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-2 rounded-full ${
                      attendance.type === 'boarding'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {attendance.type === 'boarding' ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <XCircle className="h-5 w-5" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {attendance.student?.full_name || 'Unknown Student'}
                        {attendance.student?.grade && (
                          <span className="text-sm text-muted-foreground">
                            ({attendance.student.grade})
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(attendance.timestamp)}
                        </span>
                        {attendance.bus && (
                          <span className="flex items-center gap-1">
                            <BusIcon className="h-3 w-3" />
                            {attendance.bus.bus_number}
                          </span>
                        )}
                        {attendance.geofence && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {attendance.geofence.name} ({attendance.geofence.type})
                          </span>
                        )}
                        {attendance.latitude && attendance.longitude && (
                          <span className="text-xs">
                            📍 {Number(attendance.latitude).toFixed(4)}, {Number(attendance.longitude).toFixed(4)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      attendance.type === 'boarding'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {attendance.type === 'boarding' ? 'Boarded' : 'Exited'}
                    </span>
                    {attendance.manual_override && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Manual Entry
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-2">About Attendance Records</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Attendance records are automatically created when students scan their RFID cards on buses</li>
            <li>• The system uses geofencing to automatically determine if a student is boarding or exiting</li>
            <li>• Records include GPS coordinates, timestamps, and geofence information</li>
            <li>• Parents receive instant notifications when their child boards or exits the bus</li>
            <li>• Use filters above to search for specific students, buses, or date ranges</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

