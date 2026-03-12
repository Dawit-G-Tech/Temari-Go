export type BusCurrentLocation = {
  busId?: string;
  latitude: number;
  longitude: number;
  speed?: number | null;
  timestamp?: string;
  [key: string]: unknown;
};

export type BusLocationPoint = {
  latitude: number;
  longitude: number;
  speed?: number | null;
  timestamp?: string;
  [key: string]: unknown;
};

