import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as invoicesApi from '@/src/api/invoices';
import * as paymentsApi from '@/src/api/payments';
import type { InvoiceStatus, PayInitRequest } from '@/src/types/billing';

import { queryKeys } from './queryKeys';

export function useInvoices(filters?: {
  status?: InvoiceStatus;
  studentId?: string;
  dueFrom?: string;
  dueTo?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: queryKeys.invoices(filters),
    queryFn: () => invoicesApi.listInvoices(filters),
  });
}

export function usePaymentsByParent(parentId: string, filters?: any) {
  return useQuery({
    enabled: Boolean(parentId),
    queryKey: queryKeys.paymentsByParent(parentId, filters),
    queryFn: () => paymentsApi.listPaymentsByParent(parentId, filters),
  });
}

export function usePaymentsByStudent(studentId: string, filters?: any) {
  return useQuery({
    enabled: Boolean(studentId),
    queryKey: queryKeys.paymentsByStudent(studentId, filters),
    queryFn: () => paymentsApi.listPaymentsByStudent(studentId, filters),
  });
}

export function useInitPay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PayInitRequest) => paymentsApi.initPay(body),
    onSuccess: async () => {
      // Best-effort refresh billing views
      await qc.invalidateQueries({ queryKey: ['invoices'] });
      await qc.invalidateQueries({ queryKey: ['paymentsByParent'] });
      await qc.invalidateQueries({ queryKey: ['paymentsByStudent'] });
    },
  });
}

