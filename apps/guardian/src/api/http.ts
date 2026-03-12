import { constants } from '@/src/config/constants';
import { env } from '@/src/config/env';

import { getAccessToken } from './tokenStore';

export type ApiError = {
  status: number;
  message: string;
  code?: string;
  details?: unknown;
};

export type RequestOptions = {
  auth?: boolean;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  timeoutMs?: number;
  /**
   * Internal: set false to skip refresh handling (used by refresh itself).
   */
  allowRefresh?: boolean;
};

function toQueryString(query: RequestOptions['query']): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    params.set(k, String(v));
  }
  const str = params.toString();
  return str ? `?${str}` : '';
}

function normalizeError(status: number, data: any): ApiError {
  const message =
    (typeof data === 'object' && data && (data.message || data.error || data.msg)) ||
    (typeof data === 'string' && data) ||
    'Request failed';
  const code = typeof data === 'object' && data ? (data.code as string | undefined) : undefined;
  return { status, message: String(message), code, details: data };
}

export async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? constants.api.timeoutMs;
  const allowRefresh = options.allowRefresh ?? true;

  const url = `${env.API_BASE_URL}${constants.api.basePath}${path}${toQueryString(options.query)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    };

    if (options.auth) {
      const token = getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const contentType = res.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

    if (res.ok) return data as T;

    // Attempt a single refresh+retry on 401 when auth is enabled.
    if (res.status === 401 && options.auth && allowRefresh) {
      // Lazy import to avoid require cycle: http -> refresh -> http
      const { refreshAndUpdateSession } = await import('./refresh');
      const refreshed = await refreshAndUpdateSession();
      if (refreshed) {
        return await request<T>(method, path, { ...options, allowRefresh: false });
      }
    }

    throw normalizeError(res.status, data);
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw { status: 0, message: 'Request timed out' } satisfies ApiError;
    }
    if (typeof e?.status === 'number' && typeof e?.message === 'string') throw e as ApiError;
    throw { status: 0, message: 'Network error', details: e } satisfies ApiError;
  } finally {
    clearTimeout(timeout);
  }
}

