import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppProviders } from '@/src/hooks/AppProviders';
import { useAuth } from '@/src/hooks/useAuth';
import { useMe } from '@/src/hooks/useMe';
import { isParentProfileComplete } from '@/src/utils/profileCompletion';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { registerPushTokenOncePerBoot } from '@/src/utils/push/registerPushToken';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AuthGate() {
  const router = useRouter();
  const segments = useSegments() as unknown as string[];
  const { session } = useAuth();
  const meQuery = useMe();

  const inAuthGroup = segments[0] === '(auth)';
  const inOnboardingGroup = segments[0] === '(onboarding)';

  // While restoring session or fetching /users/me, show a lightweight spinner.
  const isBusy =
    session.status === 'unknown' ||
    (session.status === 'authenticated' && (meQuery.isLoading || meQuery.isFetching));

  useEffect(() => {
    if (session.status === 'unknown') return;

    if (session.status === 'unauthenticated') {
      if (!inAuthGroup) router.replace('/(auth)/login' as any);
      return;
    }

    // authenticated
    if (!meQuery.data) return;

    // Best-effort device registration (push token)
    void registerPushTokenOncePerBoot();

    const complete = isParentProfileComplete(meQuery.data);
    if (!complete) {
      if (!inOnboardingGroup) router.replace('/(onboarding)/profile' as any);
      return;
    }

    // profile complete
    if (inAuthGroup || inOnboardingGroup) router.replace('/(tabs)/children' as any);
  }, [session.status, inAuthGroup, inOnboardingGroup, router, meQuery.data]);

  if (isBusy) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AppProviders>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthGate />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
          <Stack.Screen name="modals/payment-webview" options={{ presentation: 'modal', title: 'Payment' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AppProviders>
  );
}
