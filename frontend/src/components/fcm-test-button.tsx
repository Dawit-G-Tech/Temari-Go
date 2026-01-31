'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useFCM } from '@/hooks/use-fcm';
import { useState } from 'react';

export const FCMTestButton = () => {
  const { token, isSupported, permission, loading, error, requestPermission, sendTestNotification } = useFCM();
  const [testLoading, setTestLoading] = useState(false);

  const handleRequestPermission = async () => {
    await requestPermission();
  };

  const handleSendTest = async () => {
    setTestLoading(true);
    try {
      await sendTestNotification();
      // Show success message
      alert('Test notification sent! Check your notifications.');
    } catch (err) {
      console.error('Error sending test notification:', err);
    } finally {
      setTestLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <Card className="p-4">
        <p className="text-sm text-gray-600">
          Your browser does not support push notifications.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Firebase Cloud Messaging Test</h3>
        <p className="text-sm text-gray-600 mb-4">
          Test push notifications in your browser
        </p>
      </div>

      <div className="space-y-3">
        {/* Permission Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
          <span className="text-sm font-medium">Permission Status:</span>
          <span className={`text-sm font-semibold ${
            permission === 'granted' ? 'text-green-600' :
            permission === 'denied' ? 'text-red-600' :
            'text-yellow-600'
          }`}>
            {permission === 'granted' ? 'Granted' :
             permission === 'denied' ? 'Denied' :
             'Not Set'}
          </span>
        </div>

        {/* Token Status */}
        {token && (
          <div className="p-3 bg-green-50 rounded">
            <p className="text-xs text-gray-600 mb-1">FCM Token:</p>
            <p className="text-xs font-mono text-green-700 break-all">{token.substring(0, 50)}...</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 rounded">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {permission !== 'granted' ? (
            <Button
              onClick={handleRequestPermission}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Requesting...' : 'Enable Notifications'}
            </Button>
          ) : (
            <>
              {!token && (
                <Button
                  onClick={handleRequestPermission}
                  disabled={loading}
                  variant="outline"
                  className="flex-1"
                >
                  {loading ? 'Getting Token...' : 'Get FCM Token'}
                </Button>
              )}
              {token && (
                <Button
                  onClick={handleSendTest}
                  disabled={testLoading || loading}
                  className="flex-1"
                >
                  {testLoading ? 'Sending...' : 'Send Test Notification'}
                </Button>
              )}
            </>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-4 p-3 bg-blue-50 rounded">
          <p className="text-xs text-blue-800">
            <strong>Instructions:</strong>
            <br />
            1. Click &quot;Enable Notifications&quot; to allow browser notifications
            <br />
            2. Once permission is granted, your FCM token will be saved
            <br />
            3. Click &quot;Send Test Notification&quot; to receive a test notification
          </p>
        </div>
      </div>
    </Card>
  );
};
