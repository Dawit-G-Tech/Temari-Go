import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/src/hooks/useAuth';
import { useMe } from '@/src/hooks/useMe';

export default function ProfileTab() {
  const { logout } = useAuth();
  const me = useMe();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Profile</ThemedText>

      {me.isLoading ? <ThemedText>Loading…</ThemedText> : null}
      {me.error ? <ThemedText style={styles.errorText}>{(me.error as any)?.message ?? 'Failed'}</ThemedText> : null}

      {me.data ? (
        <View style={styles.card}>
          <ThemedText type="defaultSemiBold">{String(me.data.name ?? '—')}</ThemedText>
          <ThemedText>Email: {String(me.data.email ?? '—')}</ThemedText>
          <ThemedText>Phone: {String(me.data.phone_number ?? '—')}</ThemedText>
          <ThemedText>Language: {String(me.data.language_preference ?? '—')}</ThemedText>
          <ThemedText>Role: {String(me.data.role ?? '—')}</ThemedText>
        </View>
      ) : null}

      <Pressable onPress={() => void logout()} style={styles.button}>
        <ThemedText type="defaultSemiBold">Log out</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  card: {
    borderWidth: 1,
    borderColor: '#E3E6EA',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  button: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#0a7ea4',
  },
  errorText: { color: '#B42318' },
});

