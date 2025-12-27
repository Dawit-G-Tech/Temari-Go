'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const accessToken = searchParams.get('accessToken');
      const refreshToken = searchParams.get('refreshToken');
      const userParam = searchParams.get('user');
      const error = searchParams.get('error');

      if (error) {
        console.error('Authentication error:', error);
        router.push('/sign-in?error=authentication_failed');
        return;
      }

      if (accessToken && refreshToken && userParam) {
        try {
          const user = JSON.parse(decodeURIComponent(userParam));
          
          // Store tokens and user data in localStorage
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          localStorage.setItem('user', JSON.stringify(user));
          
          // Refresh the auth client state
          authClient.refreshAuthState();
          
          // Redirect to home page
          router.push('/');
        } catch (error) {
          console.error('Error parsing user data:', error);
          router.push('/sign-in?error=authentication_failed');
        }
      } else {
        router.push('/sign-in?error=missing_tokens');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}
