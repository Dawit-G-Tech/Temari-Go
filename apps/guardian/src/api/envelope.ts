export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
  code?: string;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
  };
};

export function unwrapData<T>(res: ApiEnvelope<T>): T {
  return res.data;
}

