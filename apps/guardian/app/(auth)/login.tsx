import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/src/hooks/useAuth';

export default function LoginScreen() {
  const { login } = useAuth();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => emailOrUsername.trim().length > 0 && password.length >= 1 && !submitting,
    [emailOrUsername, password, submitting]
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Parent Login</ThemedText>

      <View style={styles.field}>
        <ThemedText type="defaultSemiBold">Email or Username</ThemedText>
        <TextInput
          value={emailOrUsername}
          onChangeText={setEmailOrUsername}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="email@example.com"
          style={styles.input}
        />
      </View>

      <View style={styles.field}>
        <ThemedText type="defaultSemiBold">Password</ThemedText>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          style={styles.input}
        />
      </View>

      {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

      <Pressable
        disabled={!canSubmit}
        onPress={async () => {
          setSubmitting(true);
          setError(null);
          try {
            await login({ emailOrUsername: emailOrUsername.trim(), password });
          } catch (e: any) {
            setError(e?.message ?? 'Login failed');
          } finally {
            setSubmitting(false);
          }
        }}
        style={[styles.button, !canSubmit && styles.buttonDisabled]}>
        <ThemedText type="defaultSemiBold">{submitting ? 'Signing in…' : 'Sign in'}</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 14,
    justifyContent: 'center',
  },
  field: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#C7CBD1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  button: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#0a7ea4',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  errorText: {
    color: '#B42318',
  },
});

