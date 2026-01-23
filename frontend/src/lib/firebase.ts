import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging, isSupported } from 'firebase/messaging';

// Firebase configuration
// These should be set in your environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // VAPID key is required for web push notifications
  vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
};

// Initialize Firebase
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Get messaging instance (only in browser)
let messaging: Messaging | null = null;

export const getMessagingInstance = async (): Promise<Messaging | null> => {
  if (typeof window === 'undefined') {
    return null; // Server-side rendering
  }

  // Check if browser supports FCM
  const supported = await isSupported();
  if (!supported) {
    console.warn('This browser does not support Firebase Cloud Messaging');
    return null;
  }

  if (!messaging) {
    try {
      // Register service worker for background notifications
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          console.log('Service Worker registered:', registration);
        } catch (swError) {
          console.warn('Service Worker registration failed:', swError);
        }
      }

      messaging = getMessaging(app);
    } catch (error) {
      console.error('Error initializing Firebase Messaging:', error);
      return null;
    }
  }

  return messaging;
};

/**
 * Request notification permission and get FCM token
 */
export const requestNotificationPermission = async (): Promise<string | null> => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return null;
    }

    // Get messaging instance
    const messagingInstance = await getMessagingInstance();
    if (!messagingInstance) {
      console.error('Messaging instance not available');
      return null;
    }

    // Get FCM token
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error('VAPID key is not configured');
      return null;
    }

    const token = await getToken(messagingInstance, {
      vapidKey,
    });

    if (!token) {
      console.warn('No FCM token available');
      return null;
    }

    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

/**
 * Listen for foreground messages
 */
export const onMessageListener = (): Promise<any> => {
  return new Promise((resolve) => {
    getMessagingInstance().then((messagingInstance) => {
      if (!messagingInstance) {
        resolve(null);
        return;
      }

      onMessage(messagingInstance, (payload) => {
        resolve(payload);
      });
    });
  });
};

export default app;
