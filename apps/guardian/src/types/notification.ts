import type { Pagination } from './pagination';

export type NotificationItem = {
  id: string;
  type?: string;
  title?: string | null;
  body?: string | null;
  read?: boolean;
  createdAt?: string;
  [key: string]: unknown;
};

export type NotificationListResponse = {
  data: NotificationItem[];
  pagination?: Pagination;
};

