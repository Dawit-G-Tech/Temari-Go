import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function PaymentWebViewModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ url?: string }>();

  const url = useMemo(() => {
    const u = params.url;
    return typeof u === 'string' ? u : '';
  }, [params.url]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="defaultSemiBold">Chapa Checkout</ThemedText>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <ThemedText type="link">Close</ThemedText>
        </Pressable>
      </View>

      {!url ? (
        <View style={styles.empty}>
          <ThemedText>No checkout URL provided.</ThemedText>
        </View>
      ) : (
        <WebView source={{ uri: url }} startInLoadingState />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E3E6EA',
  },
  closeButton: { paddingVertical: 6, paddingHorizontal: 10 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

