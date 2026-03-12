import { request } from '@/src/api/http';
import type { BusCurrentLocation, BusLocationPoint } from '@/src/types/location';
import type { ApiEnvelope } from '@/src/api/envelope';
import { unwrapData } from '@/src/api/envelope';

export async function getBusCurrent(busId: string): Promise<BusCurrentLocation> {
  const res = await request<ApiEnvelope<BusCurrentLocation>>('GET', `/locations/bus/${encodeURIComponent(busId)}/current`, {
    auth: true,
  });
  return unwrapData(res);
}

export async function getBusHistory(
  busId: string,
  query?: { startDate?: string; endDate?: string; limit?: number }
): Promise<BusLocationPoint[]> {
  const res = await request<ApiEnvelope<BusLocationPoint[]>>('GET', `/locations/bus/${encodeURIComponent(busId)}/history`, {
    auth: true,
    query,
  });
  return unwrapData(res);
}

/**
 * Alias endpoint: GET /locations/bus/:busId behaves like history.
 */
export async function getBusLocations(
  busId: string,
  query?: { startDate?: string; endDate?: string; limit?: number }
): Promise<BusLocationPoint[]> {
  const res = await request<ApiEnvelope<BusLocationPoint[]>>('GET', `/locations/bus/${encodeURIComponent(busId)}`, {
    auth: true,
    query,
  });
  return unwrapData(res);
}

