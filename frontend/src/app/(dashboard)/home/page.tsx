 "use client";

import React, { useEffect, useMemo, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { busAPI, type Bus } from "@/lib/bus-api";
import { studentAPI, type Student } from "@/lib/student-api";
import {
  notificationAPI,
  type NotificationItem,
} from "@/lib/notification-api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell, BusFront, GraduationCap, Shield } from "lucide-react";

function formatWhen(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function HomePage() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getToken = () => authClient.getAccessToken() ?? undefined;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        const [{ items }, studentList, notif] = await Promise.all([
          busAPI.getAll(token, { page: 1, pageSize: 200 }),
          studentAPI.getAll(token),
          notificationAPI.list({ limit: 10, accessToken: token }),
        ]);
        setBuses(items);
        setStudents(Array.isArray(studentList) ? studentList : []);
        setNotifications(notif.notifications);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to load dashboard data";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const kpis = useMemo(() => {
    const activeBuses = buses.length;
    const totalStudents = students.length;
    const unreadAlerts = notifications.filter((n) => !n.read_at).length;
    return { activeBuses, totalStudents, unreadAlerts };
  }, [buses, students, notifications]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Admin overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            High-level view of fleet, students, and recent alerts. Detailed
            operations live under Fleet, Map, Billing, and Notifications.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs text-muted-foreground">
          <Shield className="size-3.5" />
          Admin console — guardians and drivers use the mobile app.
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active buses</CardTitle>
            <BusFront className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-semibold">
                {kpis.activeBuses}
              </div>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Total buses configured in the system.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <GraduationCap className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-semibold">
                {kpis.totalStudents}
              </div>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Total enrolled students linked to bus routes.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Unread alerts
            </CardTitle>
            <Bell className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-semibold">
                {kpis.unreadAlerts}
              </div>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              New notifications for attendance, payments, or safety.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Recent notifications</CardTitle>
            <p className="text-xs text-muted-foreground">
              Latest alerts flowing through the system. See the{" "}
              <span className="font-medium">Notifications</span> page for full
              history and filtering.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">
              No notifications yet. Attendance, safety, and billing events will
              appear here as the system goes live.
            </p>
          ) : (
            <div className="max-h-64 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((n) => {
                    const isUnread = !n.read_at;
                    return (
                      <TableRow key={n.id}>
                        <TableCell className="text-xs">
                          <Badge
                            variant={isUnread ? "default" : "outline"}
                            className="text-[10px] font-normal"
                          >
                            {n.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {n.message}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {formatWhen(n.sent_at)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {isUnread ? "Unread" : "Read"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
