import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Item } from '../types';
import { ItemImage } from './ItemImage';
import { config } from '../config';

const { width, height } = Dimensions.get('window');

interface Props {
  item: Item;
  onInfoPress: () => void;
}

export function ItemCard({ item, onInfoPress }: Props) {
  const showOwnerBadge = config.debug.SHOW_OWNER_DEBUG && item.owner_display_name != null;

  return (
    <View style={styles.card}>
      <ItemImage imageUrl={item.image_url} style={styles.image} />
      {showOwnerBadge && (
        <View style={styles.ownerBadge}>
          <Text style={styles.ownerBadgeText}>Owner: {item.owner_display_name}</Text>
        </View>
      )}
      <View style={styles.infoContainer}>
        <View style={styles.textRow}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.points}>{item.points_value} pts</Text>
            {item.distance_km != null && (
              <Text style={styles.distance}>{item.distance_km.toFixed(1)} km</Text>
            )}
          </View>
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 12,
  },
  points: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c47ff',
  },
  distance: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888',
  },
  ownerBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ownerBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
