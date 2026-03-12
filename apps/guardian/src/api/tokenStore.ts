export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

let tokens: AuthTokens | null = null;

export function getTokens(): AuthTokens | null {
  return tokens;
}

export function setTokens(next: AuthTokens | null) {
  tokens = next;
}

export function getAccessToken(): string | null {
  return tokens?.accessToken ?? null;
}

export function getRefreshToken(): string | null {
  return tokens?.refreshToken ?? null;
}

