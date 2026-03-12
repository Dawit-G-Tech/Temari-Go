export type LoginRequest = {
  emailOrUsername: string;
  password: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn?: string;
  refreshTokenExpiresIn?: string;
};

export type LoginData = {
  user: unknown;
  tokens: AuthTokens;
};

export type RefreshRequest = {
  refreshToken: string;
};

export type RefreshData = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: string;
};

