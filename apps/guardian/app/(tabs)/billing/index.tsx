import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useInvoices, usePaymentsByParent } from '@/src/hooks/useBilling';
import { useMe } from '@/src/hooks/useMe';

export default function BillingTab() {
  const me = useMe();
  const invoices = useInvoices({ limit: 50, offset: 0 });
  const payments = usePaymentsByParent(me.data?.id ?? '', { limit: 20, offset: 0 });

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerRow}>
        <ThemedText type="title">Billing</ThemedText>
        <Link href="/billing/pay" asChild>
          <Pressable style={styles.button}>
            <ThemedText type="defaultSemiBold">Pay</ThemedText>
          </Pressable>
        </Link>
      </View>

      <ThemedText type="subtitle">Invoices</ThemedText>
      {invoices.isLoading ? <ThemedText>Loading invoices…</ThemedText> : null}
      {invoices.error ? (
        <ThemedText style={styles.errorText}>{(invoices.error as any)?.message ?? 'Failed to load'}</ThemedText>
      ) : null}
      <FlatList
        data={invoices.data?.data ?? []}
        keyExtractor={(item: any) => String(item.id)}
        renderItem={({ item }: any) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <ThemedText type="defaultSemiBold">#{String(item.id)}</ThemedText>
              <ThemedText>{String(item.status ?? '-')}</ThemedText>
            </View>
            <View style={styles.row}>
              <ThemedText>Amount: {String(item.amount ?? '-')}</ThemedText>
              <ThemedText>Due: {String(item.dueDate ?? '-')}</ThemedText>
            </View>
          </View>
        )}
        ListEmptyComponent={invoices.isLoading ? null : <ThemedText>No invoices.</ThemedText>}
      />

      <ThemedText type="subtitle" style={{ marginTop: 10 }}>
        Recent payments
      </ThemedText>
      {payments.isLoading ? <ThemedText>Loading payments…</ThemedText> : null}
      {payments.error ? (
        <ThemedText style={styles.errorText}>{(payments.error as any)?.message ?? 'Failed to load'}</ThemedText>
      ) : null}
      <FlatList
        data={payments.data?.data ?? []}
        keyExtractor={(item: any) => String(item.id)}
        renderItem={({ item }: any) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <ThemedText type="defaultSemiBold">{String(item.status ?? '-')}</ThemedText>
              <ThemedText>{String(item.amount ?? '-')} {String(item.currency ?? '')}</ThemedText>
            </View>
            <ThemedText>{String(item.createdAt ?? '')}</ThemedText>
          </View>
        )}
        ListEmptyComponent={payments.isLoading ? null : <ThemedText>No payments.</ThemedText>}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card: {
    borderWidth: 1,
    borderColor: '#E3E6EA',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    gap: 6,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#0a7ea4',
  },
  errorText: { color: '#B42318' },
});

