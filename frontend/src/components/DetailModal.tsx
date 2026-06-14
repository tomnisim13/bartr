import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Item } from '../types';

interface Props {
  item: Item | null;
  visible: boolean;
  onClose: () => void;
}

export function DetailModal({ item, visible, onClose }: Props) {
  if (!item) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{item.name}</Text>
          <Text style={styles.points}>{item.points_value} points</Text>
          <ScrollView style={styles.descriptionContainer}>
            <Text style={styles.description}>
              {item.description || 'No description provided.'}
            </Text>
          </ScrollView>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 300,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  points: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6c47ff',
    marginTop: 4,
    marginBottom: 16,
  },
  descriptionContainer: {
    maxHeight: 200,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#6c47ff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
