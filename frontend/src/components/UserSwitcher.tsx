import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { fetchDevUsers, DevUser } from '../api';
import { getDevUserId, setDevUserId } from '../devIdentity';
import { logger } from '../logger';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSwitched: () => void;
}

export function UserSwitcher({ visible, onClose, onSwitched }: Props) {
  const [users, setUsers] = useState<DevUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setLoadFailed(false);
    fetchDevUsers()
      .then(setUsers)
      .catch(err => {
        logger.error({ err: String(err) }, 'UserSwitcher: fetchDevUsers failed');
        setUsers([]);
        setLoadFailed(true);
      })
      .finally(() => setLoading(false));
  }, [visible]);

  const pick = (user: DevUser) => {
    setDevUserId(user.id);
    onClose();
    onSwitched();
  };

  const currentId = getDevUserId();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Switch User</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#6c47ff" />
          ) : loadFailed ? (
            <Text style={styles.errorText}>Couldn't load users. Check your connection.</Text>
          ) : users.length === 0 ? (
            <Text style={styles.errorText}>No dev users found.</Text>
          ) : (
            <FlatList
              data={users}
              keyExtractor={u => u.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.row} onPress={() => pick(item)}>
                  <Text style={[styles.name, item.id === currentId && styles.active]}>
                    {item.display_name}
                  </Text>
                  <Text style={styles.uid}>{item.id.slice(0, 8)}...</Text>
                </TouchableOpacity>
              )}
            />
          )}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '60%' },
  title: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 16, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eee' },
  name: { fontSize: 16, color: '#333' },
  active: { color: '#6c47ff', fontWeight: '700' },
  uid: { fontSize: 12, color: '#999' },
  closeBtn: { marginTop: 16, alignItems: 'center', paddingVertical: 12 },
  closeBtnText: { color: '#6c47ff', fontSize: 16, fontWeight: '600' },
  errorText: { color: '#999', fontSize: 14, textAlign: 'center', paddingVertical: 24 },
});
