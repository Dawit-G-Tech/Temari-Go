"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { authClient } from "@/lib/auth-client";
import { busAPI, type Bus } from "@/lib/bus-api";
import { useLiveBusTracking, type TimeRange } from "../hooks/use-live-bus-tracking";
import { LiveLocationMap } from "@/components/live-location-map";
import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Activity,
  Clock,
  MapPin,
  RefreshCw,
  Search,
  Shield,
} from "lucide-react";

function formatTime(date: Date | null | undefined): string {
  if (!date) return "—";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatRelativeTime(date: Date | null | undefined): string {
  if (!date) return "No data";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return "Just now";
  const mins = Math.round(diffMs / 60_000);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return `${hours} h ago`;
}

export function LiveTrackingView() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [buses, setBuses] = useState<Bus[]>([]);
  const [busesLoading, setBusesLoading] = useState(true);
  const [busesError, setBusesError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedBusId, setSelectedBusId] = useState<number | null>(null);

  const getToken = () => authClient.getAccessToken() ?? undefined;

  useEffect(() => {
    const loadBuses = async () => {
      setBusesLoading(true);
      setBusesError(null);
      try {
        const token = getToken();
        const { items } = await busAPI.getAll(token, {
          page: 1,
          pageSize: 200,
        });
        setBuses(items);
        if (items.length > 0 && selectedBusId == null) {
          setSelectedBusId(items[0].id);
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to load buses";
        setBusesError(msg);
      } finally {
        setBusesLoading(false);
      }
    };

    void loadBuses();
  }, [selectedBusId]);

  const accessToken = getToken();
  const {
    currentLocation,
    currentStatus,
    currentError,
    history,
    historyStatus,
    historyError,
    timeRange,
    setTimeRange,
    refetchCurrent,
    refetchHistory,
    lastUpdated,
    isStale,
  } = useLiveBusTracking(selectedBusId, accessToken, {
    pollIntervalMs: 5000,
  });

  const filteredBuses = useMemo(() => {
    if (!search.trim()) return buses;
    return buses.filter((b) =>
      b.bus_number.toLowerCase().includes(search.toLowerCase())
    );
  }, [buses, search]);

  const selectedBus = useMemo(
    () => buses.find((b) => b.id === selectedBusId) ?? null,
    [buses, selectedBusId]
  );

  const handleTimeRangePreset = (preset: "30m" | "2h" | "today") => {
    const now = new Date();
    let start: Date;
    if (preset === "30m") {
      start = new Date(now.getTime() - 30 * 60 * 1000);
    } else if (preset === "2h") {
      start = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    } else {
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0
      );
      start = startOfDay;
    }
    const range: TimeRange = { startDate: start, endDate: now };
    setTimeRange(range);
    void refetchHistory();
  };

  const center = useMemo(() => {
    if (!currentLocation) return null;
    const lat = Number(currentLocation.latitude);
    const lng = Number(currentLocation.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }, [currentLocation]);

  const path = useMemo(
    () =>
      history.length > 0
        ? history
            .map((h) => ({
              lat: Number(h.latitude),
              lng: Number(h.longitude),
            }))
            .filter(
              (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)
            )
        : [],
    [history]
  );

  const speedValue =
  currentLocation && currentLocation.speed != null
    ? Number(currentLocation.speed)
    : null;

  const currentSpeed =
    speedValue != null && Number.isFinite(speedValue)
      ? `${speedValue.toFixed(1)} km/h`
      : "—";

  const currentStatusLabel = (() => {
    if (!selectedBus) return "No bus selected";
    if (currentStatus === "loading") return "Loading…";
    if (currentStatus === "error") return "Error";
    if (!currentLocation) return "No location data yet";
    if (isStale) return "Offline / stale";
    if (currentLocation.speed && currentLocation.speed > 2) return "Moving";
    return "Stopped";
  })();

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
            <BreadcrumbPage>Live tracking</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <MapPin className="size-6 text-primary" aria-hidden />
            Live bus tracking
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            See where each bus is in real time and review its recent path.
          </p>
        </div>
        {!isAdmin && (
          <div className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs text-muted-foreground">
            <Shield className="size-3.5" />
            Read-only access
          </div>
        )}
      </div>

      {(busesError || currentError || historyError) && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            {busesError || currentError || historyError}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.32fr),minmax(0,0.68fr)]">
        {/* Left: bus list + filters */}
        <Card className="h-full">
          <CardHeader className="space-y-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4" />
              Buses
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search by bus number"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {busesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : filteredBuses.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No buses found. Create buses first, then GPS devices can begin
                reporting location.
              </p>
            ) : (
              <div className="max-h-[520px] space-y-1 overflow-auto pr-1">
                {filteredBuses.map((bus) => {
                  const isSelected = bus.id === selectedBusId;
                  const isThisBusCurrent =
                    currentLocation && currentLocation.bus_id === bus.id;

                  return (
                    <button
                      key={bus.id}
                      type="button"
                      onClick={() => setSelectedBusId(bus.id)}
                      className={[
                        "flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-transparent hover:bg-muted",
                      ].join(" ")}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {bus.bus_number || `Bus #${bus.id}`}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {bus.school?.name ?? "Unassigned school"}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge
                          variant={isThisBusCurrent && !isStale ? "default" : "outline"}
                          className="text-[10px] font-normal"
                        >
                          {isThisBusCurrent
                            ? isStale
                              ? "Offline / stale"
                              : "Online"
                            : "Unknown"}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {formatRelativeTime(
                            isThisBusCurrent ? lastUpdated : null
                          )}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: live status, map, history */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="size-4" />
                  Live status
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {selectedBus
                    ? `Tracking ${selectedBus.bus_number}`
                    : "Select a bus to start tracking."}
                </p>
              </div>
              <Button
                size="icon"
                variant="outline"
                onClick={() => {
                  void refetchCurrent();
                  void refetchHistory();
                }}
                disabled={!selectedBusId || currentStatus === "loading"}
                aria-label="Refresh"
              >
                <RefreshCw
                  className={`size-4 ${
                    currentStatus === "loading" ? "animate-spin" : ""
                  }`}
                />
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-sm font-medium">{currentStatusLabel}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Speed</p>
                <p className="text-sm font-medium">{currentSpeed}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Last update</p>
                <p className="flex items-center gap-1 text-sm font-medium">
                  <Clock className="size-3.5 text-muted-foreground" />
                  {formatTime(lastUpdated)}
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({formatRelativeTime(lastUpdated)})
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="size-4" />
                Map
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Shows the latest reported position and, when available, the path
                within the selected time range.
              </p>
            </CardHeader>
            <CardContent>
              <LiveLocationMap
                center={center}
                current={center}
                path={path}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="size-4" />
                  History
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Browse the last reported points for the selected bus.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value="30m"
                  onValueChange={(value) =>
                    handleTimeRangePreset(value as "30m" | "2h" | "today")
                  }
                >
                  <SelectTrigger className="h-8 w-[140px] text-xs">
                    <SelectValue placeholder="Time range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30m">Last 30 minutes</SelectItem>
                    <SelectItem value="2h">Last 2 hours</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {historyStatus === "loading" ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : history.length === 0 ? (
                <p className="py-3 text-sm text-muted-foreground">
                  No location history found for this range.
                </p>
              ) : (
                <div className="max-h-64 overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Latitude</TableHead>
                        <TableHead>Longitude</TableHead>
                        <TableHead>Speed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((point) => {
                        const date = new Date(point.timestamp);
                        return (
                          <TableRow key={point.id}>
                            <TableCell className="whitespace-nowrap text-xs">
                              {date.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {point.latitude.toFixed(5)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {point.longitude.toFixed(5)}
                            </TableCell>
                            <TableCell className="text-xs">
                              {point.speed != null && Number.isFinite(Number(point.speed))
                              ? `${Number(point.speed).toFixed(1)} km/h`
                              : "—"}
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
      </div>

      <p className="text-xs text-muted-foreground">
        This view uses the same `/api/locations` stream that powers speed and
        incident monitoring. Device authentication and alerting policies can be
        layered on top without changing the UI.
      </p>
    </div>
  );
}