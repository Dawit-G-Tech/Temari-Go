import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAttendanceByStudent } from '@/src/hooks/useAttendance';

export default function ChildAttendanceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useAttendanceByStudent(String(id ?? ''));

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Attendance</ThemedText>
      {q.isLoading ? <ThemedText>Loading…</ThemedText> : null}
      {q.error ? <ThemedText style={styles.errorText}>{(q.error as any)?.message ?? 'Failed'}</ThemedText> : null}
      <FlatList
        data={q.data ?? []}
        keyExtractor={(item: any, idx) => String(item.id ?? idx)}
        renderItem={({ item }: any) => (
          <View style={styles.card}>
            <ThemedText type="defaultSemiBold">{String(item.type ?? '-')}</ThemedText>
            <ThemedText>{String(item.timestamp ?? item.createdAt ?? '')}</ThemedText>
            <ThemedText>Bus: {String(item.busId ?? item.bus_id ?? '-')}</ThemedText>
          </View>
        )}
        ListEmptyComponent={q.isLoading ? null : <ThemedText>No records.</ThemedText>}
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
    gap: 6,
    marginBottom: 10,
  },
  errorText: { color: '#B42318' },
});

