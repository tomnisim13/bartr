import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Pressable } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { ItemCard } from '../components/ItemCard';
import { DetailModal } from '../components/DetailModal';
import { EmptyState } from '../components/EmptyState';
import { fetchFeed, postInteraction, clearAllInteractions } from '../api';
import { InteractionType, config } from '../config';
import { Item } from '../types';

export function SwipeScreen() {
  const [cards, setCards] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [swiperKey, setSwiperKey] = useState(0);
  const [clearing, setClearing] = useState(false);
  const swiperRef = useRef<any>(null);

  const loadFeed = useCallback(async (offset = 0) => {
    try {
      const items = await fetchFeed(offset);
      if (items.length === 0 && offset === 0) {
        setEmpty(true);
      } else {
        setCards(prev => offset === 0 ? items : [...prev, ...items]);
      }
    } catch {
      if (cards.length === 0) setEmpty(true);
      Alert.alert('Network Error', 'Unable to update feed at this moment.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleSwipe = async (index: number, type: InteractionType) => {
    const item = cards[index];
    if (!item) return;

    try {
      await postInteraction(item.id, type);
    } catch {
      // Silently fail — interaction will be missing but UX continues
    }

    const remaining = cards.length - (index + 1);
    if (remaining <= config.feed.prefetchThreshold) {
      loadFeed(cards.length);
    }
  };

  const handleSwipedRight = (index: number) => handleSwipe(index, InteractionType.LIKE);
  const handleSwipedLeft = (index: number) => handleSwipe(index, InteractionType.DISLIKE);

  const handleSwipedAll = () => {
    setEmpty(true);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6c47ff" />
      </View>
    );
  }

  if (empty) {
    return (
      <View style={styles.center}>
        <EmptyState />
        {config.dev.enableClearAll && (
          <Pressable
            style={styles.clearButton}
            disabled={clearing}
            onPress={async () => {
              try {
                setClearing(true);
                await clearAllInteractions();
                setClearing(false);
                Alert.alert('Done', 'All interactions cleared!', [
                  {
                    text: 'OK',
                    onPress: () => {
                      setEmpty(false);
                      setLoading(true);
                      loadFeed();
                    },
                  },
                ]);
              } catch {
                setClearing(false);
                Alert.alert('Error', 'Failed to clear data. Check backend is running.');
              }
            }}
          >
            {clearing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.clearButtonText}>Clear All</Text>
            )}
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Bartr</Text>
      <View style={styles.swiperContainer}>
        <Swiper
          key={swiperKey}
          ref={swiperRef}
          cards={cards}
          cardIndex={0}
          renderCard={(item: Item) =>
            item ? (
              <ItemCard
                item={item}
                onInfoPress={() => {
                  setSelectedItem(item);
                  setModalVisible(true);
                }}
              />
            ) : null
          }
          onSwipedRight={handleSwipedRight}
          onSwipedLeft={handleSwipedLeft}
          onSwipedAll={handleSwipedAll}
          stackSize={3}
          stackSeparation={12}
          animateCardOpacity
          backgroundColor="transparent"
          cardVerticalMargin={20}
          overlayLabels={{
            left: {
              title: '🗑️',
              style: {
                label: styles.overlayLabelLeft,
                wrapper: styles.overlayWrapperLeft,
              },
            },
            right: {
              title: '🛒',
              style: {
                label: styles.overlayLabelRight,
                wrapper: styles.overlayWrapperRight,
              },
            },
          }}
        />
      </View>
      <View style={styles.iconsRow}>
        <Text style={styles.iconLabel}>🗑️</Text>
        <Text style={styles.iconLabel}>🛒</Text>
      </View>
      {config.dev.enableClearAll && (
        <Pressable
          style={styles.clearButton}
          disabled={clearing}
          onPress={() => {
            Alert.alert('Clear All', 'Reset all interactions and start fresh?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Clear',
                style: 'destructive',
                onPress: async () => {
                  try {
                    setClearing(true);
                    await clearAllInteractions();
                    setClearing(false);
                    Alert.alert('Done', 'All interactions cleared!', [
                      {
                        text: 'OK',
                        onPress: () => {
                          setCards([]);
                          setEmpty(false);
                          setSwiperKey(prev => prev + 1);
                          setLoading(true);
                          loadFeed();
                        },
                      },
                    ]);
                  } catch {
                    setClearing(false);
                    Alert.alert('Error', 'Failed to clear data. Check backend is running.');
                  }
                },
              },
            ]);
          }}
        >
          {clearing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.clearButtonText}>Clear All</Text>
          )}
        </Pressable>
      )}
      <DetailModal
        item={selectedItem}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8fc',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8fc',
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: '#6c47ff',
    textAlign: 'center',
    paddingTop: 60,
    paddingBottom: 10,
  },
  swiperContainer: {
    flex: 1,
  },
  iconsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 50,
    paddingBottom: 40,
  },
  iconLabel: {
    fontSize: 40,
  },
  overlayLabelLeft: {
    fontSize: 64,
  },
  overlayLabelRight: {
    fontSize: 64,
  },
  overlayWrapperLeft: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    marginTop: 20,
    marginLeft: -20,
  },
  overlayWrapperRight: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    marginTop: 20,
    marginLeft: 20,
  },
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
