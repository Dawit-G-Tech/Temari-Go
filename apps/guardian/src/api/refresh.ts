import { request } from './http';
import { getRefreshToken, setTokens } from './tokenStore';
import type { ApiEnvelope } from './envelope';

type RefreshData = {
  accessToken: string;
  refreshToken?: string;
};

let inFlight: Promise<boolean> | null = null;

/**
 * Tries to refresh the access token once. Returns true if session updated.
 * If refresh fails, clears tokens (forces re-login).
 */
export async function refreshAndUpdateSession(): Promise<boolean> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await request<ApiEnvelope<RefreshData>>('POST', '/auth/refresh', {
        auth: false,
        allowRefresh: false,
        body: { refreshToken },
      });
      const accessToken = res?.data?.accessToken;
      const rotatedRefresh = res?.data?.refreshToken;
      if (!accessToken) return false;
      setTokens({ accessToken, refreshToken: rotatedRefresh ?? refreshToken });
      return true;
    } catch {
      setTokens(null);
      return false;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

