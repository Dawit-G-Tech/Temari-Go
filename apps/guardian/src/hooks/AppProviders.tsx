import React, { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from '@/src/hooks/useAuth';
import { createQueryClient } from '@/src/hooks/queryClient';

export function AppProviders(props: { children: React.ReactNode }) {
  const [client] = useState(() => createQueryClient());
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>{props.children}</AuthProvider>
    </QueryClientProvider>
  );
}

