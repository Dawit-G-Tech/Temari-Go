export const queryKeys = {
  me: ['me'] as const,
  students: (filters?: unknown) => ['students', filters ?? {}] as const,
  student: (id: string) => ['student', id] as const,
  attendanceByStudent: (studentId: string, filters?: unknown) => ['attendance', studentId, filters ?? {}] as const,
  busCurrent: (busId: string) => ['busCurrent', busId] as const,
  busHistory: (busId: string, filters?: unknown) => ['busHistory', busId, filters ?? {}] as const,
  invoices: (filters?: unknown) => ['invoices', filters ?? {}] as const,
  paymentsByParent: (parentId: string, filters?: unknown) => ['paymentsByParent', parentId, filters ?? {}] as const,
  paymentsByStudent: (studentId: string, filters?: unknown) => ['paymentsByStudent', studentId, filters ?? {}] as const,
  notifications: (filters?: unknown) => ['notifications', filters ?? {}] as const,
} as const;

