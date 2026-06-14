import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { ItemCard } from '../components/ItemCard';
import { DetailModal } from '../components/DetailModal';
import { EmptyState } from '../components/EmptyState';
import { ClearAllButton } from '../components/ClearAllButton';
import { useFeed } from '../hooks/useFeed';
import { useClearAll } from '../hooks/useClearAll';
import { InteractionType, config } from '../config';
import { Item } from '../types';

export function SwipeScreen() {
  const { cards, loading, empty, reload, recordSwipe, markEmpty } = useFeed();
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [swiperKey, setSwiperKey] = useState(0);
  const swiperRef = useRef<any>(null);

  const onCleared = () => {
    setSwiperKey(prev => prev + 1);
    reload();
  };

  const emptyClearAll = useClearAll({ onCleared, confirm: false });
  const mainClearAll = useClearAll({ onCleared, confirm: true });

  const onInfoPress = (item: Item) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  if (loading) return <LoadingView />;

  if (empty) {
    return (
      <View style={styles.center}>
        <EmptyState />
        {config.dev.enableClearAll && (
          <ClearAllButton clearing={emptyClearAll.clearing} onPress={emptyClearAll.trigger} />
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
            item ? <ItemCard item={item} onInfoPress={() => onInfoPress(item)} /> : null
          }
          onSwipedRight={(i: number) => recordSwipe(i, InteractionType.LIKE)}
          onSwipedLeft={(i: number) => recordSwipe(i, InteractionType.DISLIKE)}
          onSwipedAll={markEmpty}
          stackSize={3}
          stackSeparation={12}
          animateCardOpacity
          backgroundColor="transparent"
          cardVerticalMargin={20}
          overlayLabels={{
            left: {
              title: '🗑️',
              style: { label: styles.overlayLabelLeft, wrapper: styles.overlayWrapperLeft },
            },
            right: {
              title: '🛒',
              style: { label: styles.overlayLabelRight, wrapper: styles.overlayWrapperRight },
            },
          }}
        />
      </View>
      <View style={styles.iconsRow}>
        <Text style={styles.iconLabel}>🗑️</Text>
        <Text style={styles.iconLabel}>🛒</Text>
      </View>
      {config.dev.enableClearAll && (
        <ClearAllButton clearing={mainClearAll.clearing} onPress={mainClearAll.trigger} />
      )}
      <DetailModal
        item={selectedItem}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

function LoadingView() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#6c47ff" />
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
});
