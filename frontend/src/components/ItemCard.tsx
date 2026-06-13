import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Item } from '../types';
import { getLocalImage } from '../itemImages';

const { width, height } = Dimensions.get('window');

interface Props {
  item: Item;
  onInfoPress: () => void;
}

export function ItemCard({ item, onInfoPress }: Props) {
  return (
    <View style={styles.card}>
      {(() => {
        const localImg = getLocalImage(item.image_url);
        if (localImg) return <Image source={localImg} style={styles.image} />;
        if (item.image_url) return <Image source={{ uri: item.image_url }} style={styles.image} />;
        return <View style={[styles.image, styles.placeholder]} />;
      })()}
      <View style={styles.infoContainer}>
        <View style={styles.textRow}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.points}>{item.points_value} pts</Text>
        </View>
        <TouchableOpacity style={styles.infoButton} onPress={onInfoPress}>
          <Text style={styles.infoButtonText}>i</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: width * 0.9,
    height: height * 0.65,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '75%',
    backgroundColor: '#f0f0f0',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textRow: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  points: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c47ff',
    marginTop: 4,
  },
  infoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  infoButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#666',
  },
});
