import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useMarkNotificationRead, useNotifications } from '@/src/hooks/useNotifications';

export default function NotificationsTab() {
  const notifications = useNotifications({ limit: 50, offset: 0 });
  const markRead = useMarkNotificationRead();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Notifications</ThemedText>

      {notifications.isLoading ? <ThemedText>Loading…</ThemedText> : null}
      {notifications.error ? (
        <ThemedText style={styles.errorText}>
          {(notifications.error as any)?.message ?? 'Failed to load notifications'}
        </ThemedText>
      ) : null}

      <FlatList
        data={notifications.data?.data ?? []}
        keyExtractor={(item: any) => String(item.id)}
        contentContainerStyle={{ paddingVertical: 8 }}
        renderItem={({ item }: any) => (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <ThemedText type="defaultSemiBold">{item.title ?? item.type ?? 'Notification'}</ThemedText>
              <ThemedText>{item.read ? 'Read' : 'Unread'}</ThemedText>
            </View>
            {item.body ? <ThemedText>{item.body}</ThemedText> : null}
            {!item.read ? (
              <Pressable
                disabled={markRead.isPending}
                onPress={() => markRead.mutate(String(item.id))}
                style={styles.button}>
                <ThemedText type="defaultSemiBold">Mark as read</ThemedText>
              </Pressable>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          notifications.isLoading ? null : <ThemedText>No notifications yet.</ThemedText>
        }
      />
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
    gap: 10,
    marginBottom: 10,
  },
  button: {
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#0a7ea4',
  },
  errorText: { color: '#B42318' },
});

