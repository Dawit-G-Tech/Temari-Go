import React from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useStudentDetail } from '@/src/hooks/useStudents';

export default function ChildDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useStudentDetail(String(id ?? ''));

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Student</ThemedText>

      {q.isLoading ? <ThemedText>Loading…</ThemedText> : null}
      {q.error ? <ThemedText style={styles.errorText}>{(q.error as any)?.message ?? 'Failed'}</ThemedText> : null}

      {q.data ? (
        <View style={styles.card}>
          <ThemedText type="defaultSemiBold">{String((q.data.student as any)?.full_name ?? id)}</ThemedText>
          <ThemedText>Grade: {String((q.data.student as any)?.grade ?? '-')}</ThemedText>
          <ThemedText>Bus: {String((q.data.student as any)?.busId ?? (q.data.student as any)?.bus_id ?? '-')}</ThemedText>
        </View>
      ) : null}

      <Link href={`/children/${id}/attendance`} asChild>
        <Pressable style={styles.button}>
          <ThemedText type="defaultSemiBold">Attendance</ThemedText>
        </Pressable>
      </Link>
      <Link href={`/children/${id}/tracking`} asChild>
        <Pressable style={styles.button}>
          <ThemedText type="defaultSemiBold">Bus tracking</ThemedText>
        </Pressable>
      </Link>
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
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#0a7ea4',
  },
  errorText: { color: '#B42318' },
});

