import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import * as usersApi from '@/src/api/users';

let hasAttemptedThisBoot = false;

async function getBestEffortPushToken(): Promise<string | null> {
  // Request permissions (iOS + Android 13+)
  const perms = await Notifications.getPermissionsAsync();
  if (!perms.granted) {
    const req = await Notifications.requestPermissionsAsync();
    if (!req.granted) return null;
  }

  // On Android, prefer the device push token (FCM). In managed Expo, this may require extra setup.
  try {
    if (Platform.OS === 'android') {
      const device = await Notifications.getDevicePushTokenAsync();
      if (device.data) return String(device.data);
    }
  } catch {
    // ignore; fall back
  }

  // Fallback: Expo push token (still useful during dev)
  try {
    const expoToken = await Notifications.getExpoPushTokenAsync();
    return expoToken.data;
  } catch {
    return null;
  }
}

/**
 * Best-effort push token registration. Safe to call multiple times; only runs once per app boot.
 */
export async function registerPushTokenOncePerBoot(): Promise<void> {
  if (hasAttemptedThisBoot) return;
  hasAttemptedThisBoot = true;

  const token = await getBestEffortPushToken();
  if (!token) return;

  try {
    await usersApi.registerFcmToken({ fcmToken: token });
  } catch {
    // ignore; do not break app startup
  }
}

