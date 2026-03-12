import React from 'react';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ForgotPasswordScreen() {
  return (
    <ThemedView style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
      <ThemedText type="title">Forgot password</ThemedText>
      <ThemedText>TODO: wire to POST /auth/forgot-password</ThemedText>
    </ThemedView>
  );
}

