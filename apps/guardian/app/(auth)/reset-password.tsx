import React from 'react';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ResetPasswordScreen() {
  return (
    <ThemedView style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
      <ThemedText type="title">Reset password</ThemedText>
      <ThemedText>TODO: wire to POST /auth/reset-password</ThemedText>
    </ThemedView>
  );
}

