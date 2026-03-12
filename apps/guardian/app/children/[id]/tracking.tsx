import React, { useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useStudentDetail } from '@/src/hooks/useStudents';
import { useBusCurrent } from '@/src/hooks/useLocations';

export default function ChildTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const student = useStudentDetail(String(id ?? ''));

  const busId = useMemo(() => {
    const s: any = student.data?.student;
    return String(s?.busId ?? s?.bus_id ?? '');
  }, [student.data]);

  const current = useBusCurrent(busId, { refetchIntervalMs: 8_000 });

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Bus tracking</ThemedText>

      {!busId ? <ThemedText>No bus assigned for this student.</ThemedText> : null}

      {busId ? (
        <View style={styles.card}>
          <ThemedText type="defaultSemiBold">Bus: {busId}</ThemedText>
          {current.isLoading ? <ThemedText>Loading location…</ThemedText> : null}
          {current.error ? (
            <ThemedText style={styles.errorText}>{(current.error as any)?.message ?? 'Failed'}</ThemedText>
          ) : null}
          {current.data ? (
            <>
              <ThemedText>
                Lat/Lng: {String(current.data.latitude)}, {String(current.data.longitude)}
              </ThemedText>
              <ThemedText>Speed: {String(current.data.speed ?? '-')}</ThemedText>
              <ThemedText>Time: {String(current.data.timestamp ?? '-')}</ThemedText>
            </>
          ) : null}
        </View>
      ) : null}
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
  errorText: { color: '#B42318' },
});

