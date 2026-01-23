// Firebase Messaging Service Worker
// This file must be in the public folder and named firebase-messaging-sw.js
// Note: Replace the firebaseConfig values with your actual Firebase config
// You can get these from Firebase Console > Project Settings > General

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
// TODO: Replace these values with your Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyDr1CU005XQd00TMWYC-TwFS7LFdhfxsMg",
  authDomain: "temari-go.firebaseapp.com",
  projectId: "temari-go",
  storageBucket: "temari-go.firebasestorage.app",
  messagingSenderId: "220653153267",
  appId: "1:220653153267:web:e31499f275a4dc681cc086",
  measurementId: "G-5V5BXG72P3"
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: payload.notification?.icon || '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
