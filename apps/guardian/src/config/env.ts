import Constants from 'expo-constants';

type Env = {
  API_BASE_URL: string;
};

/**
 * NOTE:
 * - For local dev on device, prefer setting a real LAN IP (not localhost).
 * - For production, inject via EAS/build-time config.
 */
function readApiBaseUrl(): string {
  // Allow passing via app config extra: expo.extra.API_BASE_URL
  const fromExtra = (Constants.expoConfig?.extra as Record<string, unknown> | undefined)?.API_BASE_URL;
  if (typeof fromExtra === 'string' && fromExtra.trim()) return fromExtra.trim();

  // Common fallback: assume backend runs on same machine as Metro, use localhost for emulators/web.
  return 'http://localhost:4000';
}

export const env: Env = {
  API_BASE_URL: readApiBaseUrl(),
};

