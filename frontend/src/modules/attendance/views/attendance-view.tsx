"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/hooks/use-auth";
import {
  attendanceAPI,
  type AttendanceRecord,
  type Student,
  type Bus,
  type AttendanceFilters,
} from "@/lib/attendance-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  MapPin,
  User,
  Bus as BusIcon,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  ClipboardList,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const PAGE_SIZE = 20;

export interface AttendanceViewProps {
  initialStudents?: Student[];
  initialBuses?: Bus[];
  initialAttendance?: {
    total: number;
    attendances: AttendanceRecord[];
  };
  initialFilters?: {
    studentId?: number;
    busId?: number;
    type?: "boarding" | "exiting";
    startDate?: string;
    endDate?: string;
    page?: number;
  };
}

export function AttendanceView({
  initialStudents = [],
  initialBuses = [],
  initialAttendance = { total: 0, attendances: [] },
  initialFilters = {},
}: AttendanceViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [attendances, setAttendances] = useState<AttendanceRecord[]>(
    initialAttendance.attendances ?? []
  );
  const [totalCount, setTotalCount] = useState(initialAttendance.total ?? 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedStudent, setSelectedStudent] = useState<string>(() =>
    initialFilters.studentId != null ? String(initialFilters.studentId) : ""
  );
  const [selectedBus, setSelectedBus] = useState<string>(() =>
    initialFilters.busId != null ? String(initialFilters.busId) : ""
  );
  const [selectedType, setSelectedType] = useState<string>(
    initialFilters.type ?? ""
  );
  const [startDate, setStartDate] = useState(initialFilters.startDate ?? "");
  const [endDate, setEndDate] = useState(initialFilters.endDate ?? "");
  const [page, setPage] = useState(initialFilters.page ?? 0);

  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [buses, setBuses] = useState<Bus[]>(initialBuses);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const isMobile = useIsMobile();
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);

  const apiFilters = useMemo((): AttendanceFilters => {
    const f: AttendanceFilters = {
      limit: PAGE_SIZE,
      offset: currentPage * PAGE_SIZE,
    };
    if (selectedStudent) f.studentId = Number(selectedStudent);
    if (selectedBus) f.busId = Number(selectedBus);
    if (selectedType) f.type = selectedType as "boarding" | "exiting";
    if (startDate) f.startDate = startDate;
    if (endDate) f.endDate = endDate;
    return f;
  }, [
    selectedStudent,
    selectedBus,
    selectedType,
    startDate,
    endDate,
    currentPage,
  ]);

  const loadFilterOptions = useCallback(async () => {
    setOptionsLoading(true);
    try {
      const token = accessToken ?? undefined;
      const [studentsData, busesData] = await Promise.all([
        attendanceAPI.getStudents(token),
        attendanceAPI.getBuses(token),
      ]);
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setBuses(Array.isArray(busesData) ? busesData : []);
    } catch (err) {
      console.error("Failed to load filter options:", err);
    } finally {
      setOptionsLoading(false);
    }
  }, [accessToken]);

  const loadAttendances = useCallback(
    async (skipUrlUpdate = false) => {
      setLoading(true);
      setError(null);
      try {
        const token = accessToken ?? undefined;
        const result = await attendanceAPI.getAllAttendance(token, apiFilters);
        const data = result?.data ?? result;
        const list = Array.isArray(data?.attendances) ? data.attendances : [];
        const total = typeof data?.total === "number" ? data.total : 0;
        setAttendances(list);
        setTotalCount(total);
        if (!skipUrlUpdate) {
          const params = new URLSearchParams();
          if (selectedStudent) params.set("studentId", selectedStudent);
          if (selectedBus) params.set("busId", selectedBus);
          if (selectedType) params.set("type", selectedType);
          if (startDate) params.set("startDate", startDate);
          if (endDate) params.set("endDate", endDate);
          if (currentPage > 0) params.set("page", String(currentPage + 1));
          const query = params.toString();
          const desired = query ? `/attendance?${query}` : "/attendance";
          router.replace(desired, { scroll: false });
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to load attendance";
        setError(msg);
        setAttendances([]);
        setTotalCount(0);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [
      accessToken,
      apiFilters,
      selectedStudent,
      selectedBus,
      selectedType,
      startDate,
      endDate,
      currentPage,
      router,
    ]
  );

  useEffect(() => {
    setAccessToken(authClient.getAccessToken());
  }, [user]);

  useEffect(() => {
    if (students.length === 0 || buses.length === 0) {
      loadFilterOptions();
    }
  }, [loadFilterOptions, students.length, buses.length]);

  useEffect(() => {
    const hasInitial =
      (initialAttendance.attendances?.length ?? 0) > 0 &&
      initialFilters.studentId === (selectedStudent ? Number(selectedStudent) : undefined) &&
      initialFilters.busId === (selectedBus ? Number(selectedBus) : undefined) &&
      initialFilters.type === (selectedType || undefined) &&
      initialFilters.startDate === (startDate || undefined) &&
      initialFilters.endDate === (endDate || undefined) &&
      (initialFilters.page ?? 0) === currentPage;
    if (!hasInitial) {
      loadAttendances();
    }
  }, [
    selectedStudent,
    selectedBus,
    selectedType,
    startDate,
    endDate,
    currentPage,
  ]);

  const handleRefresh = useCallback(() => {
    loadAttendances(true).then(() => toast.success("Attendance refreshed"));
  }, [loadAttendances]);

  const handleClearFilters = useCallback(() => {
    setSelectedStudent("");
    setSelectedBus("");
    setSelectedType("");
    setStartDate("");
    setEndDate("");
    setPage(0);
  }, []);

  const hasActiveFilters =
    selectedStudent !== "" ||
    selectedBus !== "" ||
    selectedType !== "" ||
    startDate !== "" ||
    endDate !== "";

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  }, []);

  return (
    <div className="space-y-6 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/home">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Attendance</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <ClipboardList className="size-6 text-primary" aria-hidden />
            Attendance Records
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and filter boarding and exiting records from RFID scans and
            geofencing.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
          aria-label="Refresh attendance"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-4" aria-hidden />
          )}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="space-y-4 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="size-5" />
              Records
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {loading
                ? "Loading…"
                : `${totalCount} record${totalCount !== 1 ? "s" : ""}`}
              {totalCount > PAGE_SIZE &&
                ` · Page ${currentPage + 1} of ${totalPages}`}
            </span>
          </div>

          {/* Filters: toolbar style, inline labels */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="attendance-student" className="shrink-0 text-sm text-muted-foreground">
                Student
              </Label>
              <Select
                value={selectedStudent || "all"}
                onValueChange={(v) => {
                  setSelectedStudent(v === "all" ? "" : v);
                  setPage(0);
                }}
                disabled={optionsLoading}
              >
                <SelectTrigger id="attendance-student" className="h-9 w-[180px]" aria-label="Filter by student">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All students</SelectItem>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.full_name}
                      {s.grade ? ` (${s.grade})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="h-4 w-px shrink-0 bg-border" aria-hidden />
            <div className="flex items-center gap-2">
              <Label htmlFor="attendance-bus" className="shrink-0 text-sm text-muted-foreground">
                Bus
              </Label>
              <Select
                value={selectedBus || "all"}
                onValueChange={(v) => {
                  setSelectedBus(v === "all" ? "" : v);
                  setPage(0);
                }}
                disabled={optionsLoading}
              >
                <SelectTrigger id="attendance-bus" className="h-9 w-[100px]" aria-label="Filter by bus">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {buses.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.bus_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="h-4 w-px shrink-0 bg-border" aria-hidden />
            <div className="flex items-center gap-2">
              <Label htmlFor="attendance-type" className="shrink-0 text-sm text-muted-foreground">
                Type
              </Label>
              <Select
                value={selectedType || "all"}
                onValueChange={(v) => {
                  setSelectedType(v === "all" ? "" : v);
                  setPage(0);
                }}
              >
                <SelectTrigger id="attendance-type" className="h-9 w-[110px]" aria-label="Filter by type">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="boarding">Boarding</SelectItem>
                  <SelectItem value="exiting">Exiting</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="h-4 w-px shrink-0 bg-border" aria-hidden />
            <div className="flex items-center gap-2">
              <Label htmlFor="attendance-start" className="shrink-0 text-sm text-muted-foreground">
                Date
              </Label>
              <Input
                id="attendance-start"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(0);
                }}
                className="h-9 w-[132px]"
                aria-label="From date"
              />
              <span className="text-muted-foreground">→</span>
              <Input
                id="attendance-end"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(0);
                }}
                className="h-9 w-[132px]"
                aria-label="To date"
              />
            </div>
            {hasActiveFilters && (
              <>
                <div className="h-4 w-px shrink-0 bg-border" aria-hidden />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-9 shrink-0 text-muted-foreground hover:text-foreground"
                >
                  Clear filters
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className={cn("h-14 w-full", i === 0 && "rounded-t-lg")}
                />
              ))}
            </div>
          ) : attendances.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ClipboardList className="size-6 text-muted-foreground" />
                </EmptyMedia>
                <EmptyTitle>
                  {hasActiveFilters
                    ? "No records match your filters"
                    : "No attendance records yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {hasActiveFilters
                    ? "Try clearing filters or a different date range."
                    : "Records appear when students scan RFID on buses or when geofencing triggers."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={handleClearFilters}>
                    Clear filters
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleRefresh}>
                    <RefreshCw className="size-4" />
                    Refresh
                  </Button>
                )}
              </EmptyContent>
            </Empty>
          ) : isMobile ? (
            <div className="space-y-3">
              {attendances.map((record) => (
                <Card key={record.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-full",
                          record.type === "boarding"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                        )}
                      >
                        {record.type === "boarding" ? (
                          <CheckCircle className="size-5" />
                        ) : (
                          <XCircle className="size-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-medium">
                          {record.student?.full_name ?? "Unknown"}
                          {record.student?.grade && (
                            <span className="ml-1 text-sm font-normal text-muted-foreground">
                              ({record.student.grade})
                            </span>
                          )}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {formatDate(record.timestamp)}
                          </span>
                          {record.bus && (
                            <span className="flex items-center gap-1">
                              <BusIcon className="size-3" />
                              {record.bus.bus_number}
                            </span>
                          )}
                          {record.geofence && (
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3" />
                              {record.geofence.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <Badge
                            variant={
                              record.type === "boarding" ? "default" : "secondary"
                            }
                            className={cn(
                              record.type === "boarding" &&
                                "bg-emerald-600 hover:bg-emerald-600"
                            )}
                          >
                            {record.type === "boarding" ? "Boarded" : "Exited"}
                          </Badge>
                          {record.manual_override && (
                            <span className="text-xs text-muted-foreground">
                              Manual
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[4rem]">Type</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Bus</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendances.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <Badge
                          variant={
                            record.type === "boarding" ? "default" : "secondary"
                          }
                          className={cn(
                            "font-normal",
                            record.type === "boarding" &&
                              "bg-emerald-600 hover:bg-emerald-600"
                          )}
                        >
                          {record.type === "boarding" ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="size-3" />
                              Boarded
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <XCircle className="size-3" />
                              Exited
                            </span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2 font-medium">
                          <User className="size-4 text-muted-foreground" />
                          {record.student?.full_name ?? "Unknown"}
                          {record.student?.grade && (
                            <span className="text-muted-foreground">
                              ({record.student.grade})
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(record.timestamp)}
                      </TableCell>
                      <TableCell>
                        {record.bus ? (
                          <span className="flex items-center gap-1 text-sm">
                            <BusIcon className="size-3 text-muted-foreground" />
                            {record.bus.bus_number}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {record.geofence ? (
                          <span className="flex items-center gap-1 text-sm">
                            <MapPin className="size-3" />
                            {record.geofence.name}
                            {record.geofence.type && (
                              <span className="text-xs">({record.geofence.type})</span>
                            )}
                          </span>
                        ) : record.latitude != null && record.longitude != null ? (
                          <span className="text-xs">
                            {Number(record.latitude).toFixed(4)},{" "}
                            {Number(record.longitude).toFixed(4)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {record.manual_override ? "Manual entry" : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && totalCount > PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage * PAGE_SIZE) + 1}–
                {Math.min((currentPage + 1) * PAGE_SIZE, totalCount)} of{" "}
                {totalCount}
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 0) setPage(currentPage - 1);
                      }}
                      aria-disabled={currentPage <= 0}
                      className={
                        currentPage <= 0
                          ? "pointer-events-none opacity-50"
                          : undefined
                      }
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) pageNum = i;
                    else if (currentPage < 3) pageNum = i;
                    else if (currentPage >= totalPages - 2)
                      pageNum = totalPages - 5 + i;
                    else pageNum = currentPage - 2 + i;
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(pageNum);
                          }}
                          isActive={currentPage === pageNum}
                        >
                          {pageNum + 1}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages - 1)
                          setPage(currentPage + 1);
                      }}
                      aria-disabled={currentPage >= totalPages - 1}
                      className={
                        currentPage >= totalPages - 1
                          ? "pointer-events-none opacity-50"
                          : undefined
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-muted/50 bg-muted/30">
        <CardContent className="flex gap-3 p-4">
          <Info className="size-5 shrink-0 text-muted-foreground" />
          <div className="space-y-1 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">About attendance</p>
            <ul className="list-inside list-disc space-y-0.5">
              <li>
                Records are created when students scan RFID cards on buses or
                when geofencing detects boarding/exiting.
              </li>
              <li>
                Geofencing automatically determines whether a student is
                boarding or exiting.
              </li>
              <li>
                Parents receive notifications when their child boards or exits
                the bus.
              </li>
              <li>Use the filters above to search by student, bus, or date.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
