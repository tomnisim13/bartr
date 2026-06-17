import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { ItemCard } from '../components/ItemCard';
import { DetailModal } from '../components/DetailModal';
import { MatchModal } from '../components/MatchModal';
import { EmptyState } from '../components/EmptyState';
import { ClearAllButton } from '../components/ClearAllButton';
import { UserSwitcher } from '../components/UserSwitcher';
import { LocationDeniedScreen } from './LocationDeniedScreen';
import { useLocation } from '../hooks/useLocation';
import { useFeed } from '../hooks/useFeed';
import { useClearAll } from '../hooks/useClearAll';
import { InteractionType, config } from '../config';
import { logger } from '../logger';
import { Item } from '../types';

interface Props {
  onProfilePress: () => void;
}

export function SwipeScreen({ onProfilePress }: Props) {
  const { status, coords } = useLocation();
  const { cards, loading, empty, lastMatch, reload, recordSwipe, markEmpty, clearLastMatch } = useFeed(coords);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [swiperKey, setSwiperKey] = useState(0);
  const [switcherVisible, setSwitcherVisible] = useState(false);

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

  const onSendMessage = () => {
    // Placeholder routing: messaging screen lands in Feature 5.
    logger.info({ matchId: lastMatch?.match_id }, 'Match modal: send message tapped');
    Alert.alert('Coming soon', 'Messaging will be available in the next release.');
    clearLastMatch();
  };

  if (status === 'denied') return <LocationDeniedScreen />;
  if (status === 'pending' || loading) return <LoadingView />;
  // 'granted' and 'fallback' both fall through; 'fallback' means we're using the last stored
  // location because OS permission was denied. UI can later surface a subtle banner here.

  if (empty) {
    return (
      <View style={styles.center}>
        <EmptyState />
        {config.debug.ENABLE_CLEAR_ALL_BUTTON && (
          <ClearAllButton clearing={emptyClearAll.clearing} onPress={emptyClearAll.trigger} />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {config.debug.ENABLE_SWITCH_USER ? (
          <TouchableOpacity
            onPress={() => setSwitcherVisible(true)}
            hitSlop={8}
            style={styles.headerBtn}
          >
            <Text style={styles.switchBtnText}>User</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtnPlaceholder} />
        )}
        <Text style={styles.header}>Bartr</Text>
        <TouchableOpacity
          onPress={onProfilePress}
          hitSlop={8}
          style={[styles.headerBtn, styles.profileBtn]}
        >
          <Text style={styles.profileBtnText}>Profile</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.swiperContainer}>
        <Swiper
          key={swiperKey}
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
      {config.debug.ENABLE_CLEAR_ALL_BUTTON && (
        <ClearAllButton clearing={mainClearAll.clearing} onPress={mainClearAll.trigger} />
      )}
      <DetailModal
        item={selectedItem}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
      <MatchModal
        visible={!!lastMatch?.is_match}
        onClose={clearLastMatch}
        onSendMessage={onSendMessage}
      />
      {config.debug.ENABLE_SWITCH_USER && (
        <UserSwitcher
          visible={switcherVisible}
          onClose={() => setSwitcherVisible(false)}
          onSwitched={() => { setSwiperKey(k => k + 1); reload(); }}
        />
      )}
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 10,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: '#6c47ff',
    textAlign: 'center',
    flex: 1,
  },
  headerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ff9500',
    borderRadius: 14,
  },
  headerBtnPlaceholder: {
    width: 56,
  },
  switchBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  profileBtn: {
    backgroundColor: '#6c47ff',
  },
  profileBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
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
