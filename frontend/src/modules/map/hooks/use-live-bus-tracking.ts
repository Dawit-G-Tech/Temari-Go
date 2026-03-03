"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { locationAPI, type BusLocation } from "@/lib/location-api";

export type LiveTrackingStatus = "idle" | "loading" | "success" | "error";

export interface TimeRange {
  startDate: Date;
  endDate: Date;
}

export interface UseLiveBusTrackingOptions {
  pollIntervalMs?: number;
}

export function useLiveBusTracking(
  busId: number | null,
  accessToken?: string,
  options: UseLiveBusTrackingOptions = {}
) {
  const pollIntervalMs = options.pollIntervalMs ?? 5000;

  const [currentLocation, setCurrentLocation] = useState<BusLocation | null>(
    null
  );
  const [currentStatus, setCurrentStatus] =
    useState<LiveTrackingStatus>("idle");
  const [currentError, setCurrentError] = useState<string | null>(null);

  const [history, setHistory] = useState<BusLocation[]>([]);
  const [historyStatus, setHistoryStatus] =
    useState<LiveTrackingStatus>("idle");
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [timeRange, setTimeRangeState] = useState<TimeRange>(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 60 * 60 * 1000); // last 1 hour by default
    return { startDate: start, endDate: end };
  });

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const pollTimerRef = useRef<number | null>(null);
  const isVisibleRef = useRef<boolean>(true);

  // Track tab visibility to pause polling when hidden
  useEffect(() => {
    const handleVisibility = () => {
      isVisibleRef.current = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const clearPollTimer = () => {
    if (pollTimerRef.current != null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const fetchCurrent = useCallback(async () => {
    if (!busId) {
      setCurrentLocation(null);
      setCurrentStatus("idle");
      setCurrentError(null);
      return;
    }

    try {
      setCurrentStatus((prev) => (prev === "idle" ? "loading" : prev));
      const loc = await locationAPI.getBusCurrentLocation(busId, accessToken);
      setCurrentLocation(loc);
      setCurrentStatus("success");
      setCurrentError(null);
      setLastUpdated(loc ? new Date(loc.timestamp) : null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load location";
      setCurrentError(msg);
      setCurrentStatus("error");
    }
  }, [busId, accessToken]);

  const fetchHistory = useCallback(async () => {
    if (!busId) {
      setHistory([]);
      setHistoryStatus("idle");
      setHistoryError(null);
      return;
    }

    try {
      setHistoryStatus("loading");
      const { startDate, endDate } = timeRange;
      const items = await locationAPI.getBusLocationHistory(
        busId,
        {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          limit: 500,
        },
        accessToken
      );
      // Backend returns DESC; we want ASC for path rendering
      const sorted = [...items].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      setHistory(sorted);
      setHistoryStatus("success");
      setHistoryError(null);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to load location history";
      setHistoryError(msg);
      setHistoryStatus("error");
    }
  }, [busId, accessToken, timeRange]);

  // Poll current location
  useEffect(() => {
    clearPollTimer();
    if (!busId) return;

    // Initial fetch
    void fetchCurrent();

    // Interval polling
    pollTimerRef.current = window.setInterval(() => {
      if (!isVisibleRef.current) return;
      void fetchCurrent();
    }, pollIntervalMs) as unknown as number;

    return () => {
      clearPollTimer();
    };
  }, [busId, fetchCurrent, pollIntervalMs]);

  const setTimeRange = (range: TimeRange) => {
    setTimeRangeState(range);
  };

  // Re-fetch history when bus or timeRange changes
  useEffect(() => {
    if (!busId) return;
    void fetchHistory();
  }, [busId, fetchHistory]);

  const isStale = useMemo(() => {
    if (!lastUpdated) return false;
    const now = Date.now();
    const ageMs = now - lastUpdated.getTime();
    // Consider stale after 2 minutes
    return ageMs > 2 * 60 * 1000;
  }, [lastUpdated]);

  return {
    currentLocation,
    currentStatus,
    currentError,
    history,
    historyStatus,
    historyError,
    timeRange,
    setTimeRange,
    refetchCurrent: fetchCurrent,
    refetchHistory: fetchHistory,
    lastUpdated,
    isStale,
  };
}