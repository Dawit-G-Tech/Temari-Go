import type { Pagination } from './pagination';

export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'cancelled' | string;

export type Invoice = {
  id: string;
  status?: InvoiceStatus;
  studentId?: string;
  amount?: number;
  dueDate?: string;
  [key: string]: unknown;
};

export type InvoiceListResponse = {
  data: Invoice[];
  pagination?: Pagination;
};

export type PaymentStatus = 'pending' | 'completed' | 'failed' | string;

export type Payment = {
  id: string;
  status?: PaymentStatus;
  amount?: number;
  currency?: string;
  createdAt?: string;
  tx_ref?: string;
  [key: string]: unknown;
};

export type PaymentListResponse = {
  data: Payment[];
  pagination?: Pagination;
};

export type PayInitRequest = {
  parent_id: string;
  student_id: string;
  amount: number;
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  currency?: string;
};

export type PayInitResponse = {
  checkout_url: string;
  tx_ref: string;
  payment_id: string;
  [key: string]: unknown;
};

