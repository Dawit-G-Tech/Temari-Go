'use client';

import React, { useEffect, useRef, useState } from 'react';

type LatLng = {
  lat: number;
  lng: number;
};

type GoogleMapLocationPickerProps = {
  value: LatLng | null;
  onChange?: (value: LatLng | null) => void;
  /**
   * Optional initial center if no value is provided.
   * Defaults to coordinates near Addis Ababa.
   */
  defaultCenter?: LatLng;
};

declare global {
  // eslint-disable-next-line no-var
  var __googleMapsApiPromise__: Promise<void> | undefined;
}

function loadGoogleMapsApi(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps can only be loaded in the browser.'));
  }

  if ((window as any).google?.maps) {
    return Promise.resolve();
  }

  if (globalThis.__googleMapsApiPromise__) {
    return globalThis.__googleMapsApiPromise__;
  }

  globalThis.__googleMapsApiPromise__ = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-google-maps-api="true"]',
    );

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () =>
        reject(new Error('Failed to load Google Maps script')),
      );
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsApi = 'true';

    script.onload = () => {
      if ((window as any).google?.maps) {
        resolve();
      } else {
        reject(new Error('Google Maps SDK did not initialize correctly.'));
      }
    };

    script.onerror = () => {
      reject(new Error('Failed to load Google Maps script'));
    };

    document.head.appendChild(script);
  });

  return globalThis.__googleMapsApiPromise__;
}

export function GoogleMapLocationPicker({
  value,
  onChange,
  defaultCenter = { lat: 9.0108, lng: 38.7613 }, // Addis Ababa-ish as a sensible default
}: GoogleMapLocationPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const markerRef = useRef<any | null>(null);

  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setMapError('Google Maps API key is not configured.');
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

        const initialPosition = value ?? defaultCenter;

        const map = new maps.Map(containerRef.current, {
          center: initialPosition,
          zoom: value ? 15 : 12,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        });

        mapRef.current = map;

        if (value) {
          const marker = new maps.Marker({
            map,
            position: value,
            draggable: true,
          });
          markerRef.current = marker;

          marker.addListener('dragend', () => {
            const pos = marker.getPosition();
            if (!pos) return;
            const coords = { lat: pos.lat(), lng: pos.lng() };
            onChange?.(coords);
          });
        }

        map.addListener('click', (event: any) => {
          if (!event.latLng) return;

          const coords = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng(),
          };

          if (!markerRef.current) {
            const marker = new maps.Marker({
              map,
              position: coords,
              draggable: true,
            });
            markerRef.current = marker;

            marker.addListener('dragend', () => {
              const pos = marker.getPosition();
              if (!pos) return;
              const draggedCoords = { lat: pos.lat(), lng: pos.lng() };
              onChange?.(draggedCoords);
            });
          } else {
            markerRef.current.setPosition(coords);
          }

          onChange?.(coords);
        });

        setMapLoading(false);
      })
      .catch((err: unknown) => {
        console.error(err);
        if (!isCancelled) {
          setMapError(
            err instanceof Error ? err.message : 'Failed to load Google Map.',
          );
          setMapLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [defaultCenter.lat, defaultCenter.lng, onChange, value]);

  // Keep marker in sync if the form values are changed manually
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !value) return;

    markerRef.current.setPosition(value);
    mapRef.current.setCenter(value);
  }, [value]);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="h-64 w-full rounded-md border bg-muted"
      />
      {mapLoading && !mapError && (
        <p className="text-xs text-muted-foreground">Loading map…</p>
      )}
      {mapError && (
        <p className="text-xs text-destructive">
          {mapError}
        </p>
      )}
      {!mapError && (
        <p className="text-xs text-muted-foreground">
          Click on the map to drop a pin. Drag the pin to fine‑tune the student&apos;s home
          location. The latitude and longitude fields above will update automatically.
        </p>
      )}
    </div>
  );
}

