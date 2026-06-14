import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

interface Props {
  clearing: boolean;
  onPress: () => void;
}

export function ClearAllButton({ clearing, onPress }: Props) {
  return (
    <Pressable style={styles.clearButton} disabled={clearing} onPress={onPress}>
      {clearing ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={styles.clearButtonText}>Clear All</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  clearButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginBottom: 20,
    backgroundColor: '#ff4444',
    borderRadius: 8,
    zIndex: 999,
  },
  clearButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
