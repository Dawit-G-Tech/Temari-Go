export type UserRole = 'parent' | 'admin' | 'driver' | string;

export type UserMe = {
  id: string;
  name?: string | null;
  email?: string | null;
  username?: string | null;
  phone_number?: string | null;
  role?: UserRole | null;
  language_preference?: string | null;
  [key: string]: unknown;
};

export type UpdateMeRequest = Partial<Pick<UserMe, 'name' | 'phone_number' | 'username' | 'language_preference'>>;

export type RegisterFcmTokenRequest = {
  fcmToken: string;
};

