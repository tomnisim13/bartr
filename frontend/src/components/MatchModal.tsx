import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSendMessage: () => void;
}

export function MatchModal({ visible, onClose, onSendMessage }: Props) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.emoji}>🎉</Text>
          <Text style={styles.title}>It's a Match!</Text>
          <Text style={styles.subtitle}>You both liked each other's items</Text>
          <Pressable style={[styles.button, styles.primary]} onPress={onSendMessage}>
            <Text style={styles.primaryText}>Send a Message</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.secondary]} onPress={onClose}>
            <Text style={styles.secondaryText}>Keep Swiping</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '85%',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#6c47ff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  primary: {
    backgroundColor: '#6c47ff',
    marginBottom: 10,
  },
  primaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6c47ff',
  },
  secondaryText: {
    color: '#6c47ff',
    fontSize: 16,
    fontWeight: '700',
  },
});
