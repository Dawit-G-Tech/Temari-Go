"use client";

import React, { useEffect, useRef, useState } from "react";

export type LatLng = {
  lat: number;
  lng: number;
};

type LiveLocationMapProps = {
  center?: LatLng | null;
  current?: LatLng | null;
  path?: LatLng[];
};

declare global {
  // eslint-disable-next-line no-var
  var __googleMapsLiveApiPromise__: Promise<void> | undefined;
}

function loadGoogleMapsApi(apiKey: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Google Maps can only be loaded in the browser.")
    );
  }

  if ((window as any).google?.maps) {
    return Promise.resolve();
  }

  if (globalThis.__googleMapsLiveApiPromise__) {
    return globalThis.__googleMapsLiveApiPromise__;
  }

  globalThis.__googleMapsLiveApiPromise__ = new Promise<void>(
    (resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[data-google-maps-api="true"]'
      );

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve());
        existingScript.addEventListener("error", () =>
          reject(new Error("Failed to load Google Maps script"))
        );
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.defer = true;
      script.dataset.googleMapsApi = "true";

      script.onload = () => {
        if ((window as any).google?.maps) {
          resolve();
        } else {
          reject(
            new Error("Google Maps SDK did not initialize correctly.")
          );
        }
      };

      script.onerror = () => {
        reject(new Error("Failed to load Google Maps script"));
      };

      document.head.appendChild(script);
    }
  );

  return globalThis.__googleMapsLiveApiPromise__;
}

export function LiveLocationMap({
  center,
  current,
  path,
}: LiveLocationMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const markerRef = useRef<any | null>(null);
  const polylineRef = useRef<any | null>(null);

  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setMapError("Google Maps API key is not configured.");
      setMapLoading(false);
      return;
    }

    if (!containerRef.current) {
      return;
    }

    loadGoogleMapsApi(apiKey)
      .then(() => {
        if (isCancelled || !containerRef.current) return;

        const maps = (window as any).google.maps as any;

        const pickCenter = (): LatLng => {
          const candidates = [
            center,
            current,
            { lat: 9.0108, lng: 38.7613 } as LatLng,
          ];
          for (const c of candidates) {
            if (!c) continue;
            const lat = Number(c.lat);
            const lng = Number(c.lng);
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
              return { lat, lng };
            }
          }
          return { lat: 9.0108, lng: 38.7613 };
        };

        const initialCenter = pickCenter();

        const map = new maps.Map(containerRef.current, {
          center: initialCenter,
          zoom: current ? 15 : 12,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        });

        mapRef.current = map;
        setMapLoading(false);
      })
      .catch((err: unknown) => {
        console.error(err);
        if (!isCancelled) {
          setMapError(
            err instanceof Error ? err.message : "Failed to load Google Map."
          );
          setMapLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [center?.lat, center?.lng, current?.lat, current?.lng]);

  // Sync marker + path when data changes
  useEffect(() => {
    if (!mapRef.current) return;
    const maps = (window as any).google.maps as any;

    const hasValidCoords = (point: LatLng | null | undefined) => {
      if (!point) return false;
      const lat = Number(point.lat);
      const lng = Number(point.lng);
      return Number.isFinite(lat) && Number.isFinite(lng);
    };

    if (hasValidCoords(current)) {
      const safeCurrent = {
        lat: Number(current!.lat),
        lng: Number(current!.lng),
      };

      const markerOptions = {
        map: mapRef.current,
        position: safeCurrent,
        icon: {
          path: (window as any).google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#0b63f3",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
      };

      if (!markerRef.current) {
        markerRef.current = new maps.Marker(markerOptions);
      } else {
        markerRef.current.setOptions(markerOptions);
      }

      mapRef.current.setCenter(safeCurrent);
    } else if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }

    const safePath =
      path
        ?.map((p) => ({
          lat: Number(p.lat),
          lng: Number(p.lng),
        }))
        .filter(
          (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)
        ) ?? [];

    if (safePath.length > 1) {
      if (!polylineRef.current) {
        polylineRef.current = new maps.Polyline({
          map: mapRef.current,
          path: safePath,
          strokeColor: "#0b63f3",
          strokeOpacity: 0.9,
          strokeWeight: 4,
        });
      } else {
        polylineRef.current.setPath(safePath);
      }
    } else if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
  }, [current, path]);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="h-80 w-full rounded-md border bg-muted"
      />
      {mapLoading && !mapError && (
        <p className="text-xs text-muted-foreground">Loading map…</p>
      )}
      {mapError && (
        <p className="text-xs text-destructive">{mapError}</p>
      )}
      {!mapError && (
        <p className="text-xs text-muted-foreground">
          This map shows the latest reported bus position and, when
          available, the recent path within the selected time range.
        </p>
      )}
    </div>
  );
}