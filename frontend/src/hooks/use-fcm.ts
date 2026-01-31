'use client';

import { useState, useEffect } from 'react';
import { requestNotificationPermission, onMessageListener } from '@/lib/firebase';
import { API_BASE_URL } from '@/lib/auth';
import { authClient } from '@/lib/auth-client';

interface UseFCMReturn {
  token: string | null;
  isSupported: boolean;
  permission: NotificationPermission | null;
  loading: boolean;
  error: string | null;
  requestPermission: () => Promise<void>;
  sendTestNotification: () => Promise<void>;
}

export const useFCM = (): UseFCMReturn => {
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  // Check browser support and current permission
  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    // Check if browser supports notifications
    if (!('Notification' in window)) {
      setError('This browser does not support notifications');
      setLoading(false);
      return;
    }

    setIsSupported(true);
    setPermission(Notification.permission);

    // Check if we have a stored token
    const storedToken = localStorage.getItem('fcm_token');
    if (storedToken) {
      setToken(storedToken);
    }

    setLoading(false);

    // Listen for foreground messages
    onMessageListener()
      .then((payload) => {
        if (payload) {
          console.log('Foreground message received:', payload);
          // Show notification
          if (Notification.permission === 'granted') {
            new Notification(payload.notification?.title || 'New Notification', {
              body: payload.notification?.body || '',
              icon: payload.notification?.icon || '/favicon.ico',
              badge: '/favicon.ico',
            });
          }
        }
      })
      .catch((err) => {
        console.error('Error listening for messages:', err);
      });
  }, []);

  // Request notification permission and get token
  const requestPermission = async () => {
    try {
      setLoading(true);
      setError(null);

      const fcmToken = await requestNotificationPermission();
      if (!fcmToken) {
        setError('Failed to get FCM token');
        setLoading(false);
        return;
      }

      setToken(fcmToken);
      localStorage.setItem('fcm_token', fcmToken);
      setPermission(Notification.permission);

      // Send token to backend
      try {
        const accessToken = authClient.getAccessToken();
        const response = await fetch(`${API_BASE_URL}/api/user/fcm-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({ fcmToken }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to save FCM token');
        }

        console.log('FCM token saved to backend');
      } catch (err: any) {
        console.error('Error saving FCM token to backend:', err);
        setError(err.message || 'Failed to save FCM token to backend');
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Error requesting notification permission:', err);
      setError(err.message || 'Failed to request notification permission');
      setLoading(false);
    }
  };

  // Send test notification
  const sendTestNotification = async () => {
    try {
      setLoading(true);
      setError(null);

      const accessToken = authClient.getAccessToken();
      const response = await fetch(`${API_BASE_URL}/api/notifications/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to send test notification');
      }

      const result = await response.json();
      console.log('Test notification sent:', result);
      setLoading(false);
    } catch (err: any) {
      console.error('Error sending test notification:', err);
      setError(err.message || 'Failed to send test notification');
      setLoading(false);
    }
  };

  return {
    token,
    isSupported,
    permission,
    loading,
    error,
    requestPermission,
    sendTestNotification,
  };
};
