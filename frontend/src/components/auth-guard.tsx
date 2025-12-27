'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
}

export const AuthGuard = ({ 
  children, 
  redirectTo = '/', 
  requireAuth = false 
}: AuthGuardProps) => {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (loading) return;

    // If user is authenticated and trying to access auth pages, redirect to home
    if (isAuthenticated && requireAuth === false) {
      router.push(redirectTo);
      return;
    }
    
    // If user is not authenticated and trying to access protected pages, redirect to sign-in
    if (!isAuthenticated && requireAuth === true) {
      router.push('/sign-in');
      return;
    }
  }, [router, redirectTo, requireAuth, isAuthenticated, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
