import { setTokens, type AuthTokens } from '@/src/api/tokenStore';

import { clearTokens, readTokens, writeTokens } from './secureTokens';

export type SessionState = {
  status: 'unknown' | 'authenticated' | 'unauthenticated';
  tokens: AuthTokens | null;
};

/**
 * Loads persisted tokens into the in-memory token store.
 */
export async function bootstrapSession(): Promise<SessionState> {
  const tokens = await readTokens();
  setTokens(tokens);
  return {
    status: tokens ? 'authenticated' : 'unauthenticated',
    tokens,
  };
}

export async function setSession(tokens: AuthTokens): Promise<void> {
  setTokens(tokens);
  await writeTokens(tokens);
}

export async function clearSession(): Promise<void> {
  setTokens(null);
  await clearTokens();
}

