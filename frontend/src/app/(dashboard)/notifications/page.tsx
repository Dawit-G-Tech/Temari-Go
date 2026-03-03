 "use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { authClient } from "@/lib/auth-client";
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
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Send, Shield } from "lucide-react";

function formatWhen(sentAt: string): string {
  const d = new Date(sentAt);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [sendingTest, setSendingTest] = useState(false);

  const getToken = () => authClient.getAccessToken() ?? undefined;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        const result = await notificationAPI.list({
          unreadOnly: filter === "unread",
          limit: 100,
          accessToken: token,
        });
        setNotifications(result.notifications);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to load notifications";
        setError(msg);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [filter]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read_at).length,
    [notifications]
  );

  const handleMarkRead = async (id: number) => {
    try {
      const token = getToken();
      const updated = await notificationAPI.markAsRead(id, token);
      setNotifications((items) =>
        items.map((n) => (n.id === id ? { ...n, read_at: updated.read_at } : n))
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to mark notification read";
      setError(msg);
    }
  };

  const handleSendTest = async () => {
    setSendingTest(true);
    setError(null);
    try {
      const token = getToken();
      await notificationAPI.sendTest(token);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to send test notification";
      setError(msg);
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Bell className="size-6 text-primary" aria-hidden />
            Notifications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            See your recent alerts across attendance, safety, and payments.
          </p>
        </div>
        {!isAdmin && (
          <div className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs text-muted-foreground">
            <Shield className="size-3.5" />
            Read-only access
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Inbox</CardTitle>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`
                : "You’re all caught up."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tabs
              value={filter}
              onValueChange={(value) =>
                setFilter(value as "all" | "unread")
              }
            >
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">Unread</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSendTest}
              disabled={sendingTest}
            >
              <Send className="mr-1.5 size-3.5" />
              Test push
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No notifications yet. Once attendance, payments, and safety events
              start flowing, they will appear here.
            </p>
          ) : (
            <div className="max-h-[420px] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                        <TableCell className="text-right">
                          {isUnread && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs"
                              onClick={() => handleMarkRead(n.id)}
                            >
                              Mark read
                            </Button>
                          )}
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

