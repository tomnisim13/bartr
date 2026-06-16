import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { fetchProfile, fetchTransactions } from '../api';
import { UserProfile, WalletTransaction } from '../types';

const TX_TYPE_LABELS: Record<number, string> = {
  1: 'Signup Bonus',
  2: 'Match Bonus',
  3: 'Trade Debit',
  4: 'Trade Credit',
  99: 'Adjustment',
};

interface Props {
  onBack: () => void;
}

export function ProfileScreen({ onBack }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [p, txs] = await Promise.all([fetchProfile(), fetchTransactions()]);
      setProfile(p);
      setTransactions(txs);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6c47ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Swipe</Text>
        </TouchableOpacity>
        <Text style={styles.header}>Profile</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.profileCard}>
        <Text style={styles.displayName}>{profile?.display_name ?? 'Anonymous'}</Text>
        <View style={styles.balanceBadge}>
          <Text style={styles.balanceText}>{profile?.balance_points ?? 0} pts</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Transaction History</Text>

      {transactions.length === 0 ? (
        <Text style={styles.emptyText}>No transactions yet</Text>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <View style={styles.txRow}>
              <View style={styles.txLeft}>
                <Text style={styles.txType}>{TX_TYPE_LABELS[item.type] ?? `Type ${item.type}`}</Text>
                <Text style={styles.txDesc}>{item.description ?? ''}</Text>
              </View>
              <Text style={[styles.txAmount, item.amount > 0 ? styles.positive : styles.negative]}>
                {item.amount > 0 ? '+' : ''}{item.amount}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8fc', paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f8fc' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 20 },
  backBtn: { width: 70 },
  backText: { color: '#6c47ff', fontSize: 16, fontWeight: '600' },
  header: { fontSize: 28, fontWeight: '800', color: '#6c47ff', textAlign: 'center' },
  profileCard: { alignItems: 'center', marginBottom: 30 },
  displayName: { fontSize: 22, fontWeight: '700', color: '#333', marginBottom: 8 },
  balanceBadge: { backgroundColor: '#6c47ff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  balanceText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#666', paddingHorizontal: 16, marginBottom: 10 },
  emptyText: { color: '#999', textAlign: 'center', marginTop: 20 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  txLeft: { flex: 1 },
  txType: { fontSize: 14, fontWeight: '600', color: '#333' },
  txDesc: { fontSize: 12, color: '#999', marginTop: 2 },
  txAmount: { fontSize: 16, fontWeight: '700' },
  positive: { color: '#34c759' },
  negative: { color: '#ff3b30' },
});
