'use client';

import { useState, useEffect } from 'react';
import { authClient } from '@/lib/auth-client';
import { User } from '@/lib/auth';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First refresh the auth client state from localStorage
        authClient.refreshAuthState();
        
        const currentUser = await authClient.getMe();
        setUser(currentUser);
        setIsAuthenticated(!!currentUser);
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    try {
      const response = await authClient.login(credentials);
      setUser(response.user);
      setIsAuthenticated(true);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const register = async (credentials: { name: string; email: string; password: string }) => {
    try {
      const response = await authClient.register(credentials);
      setUser(response.user);
      setIsAuthenticated(true);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authClient.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout failed:', error);
      // Clear local state even if server logout fails
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  return {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
  };
};
