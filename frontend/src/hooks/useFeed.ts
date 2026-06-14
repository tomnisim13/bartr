import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { fetchFeed, postInteraction } from '../api';
import { InteractionType, config } from '../config';
import { logger } from '../logger';
import { Item } from '../types';

interface UseFeedResult {
  cards: Item[];
  loading: boolean;
  empty: boolean;
  reload: () => void;
  recordSwipe: (index: number, type: InteractionType) => Promise<void>;
  markEmpty: () => void;
  resetCards: () => void;
}

export function useFeed(): UseFeedResult {
  const [cards, setCards] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);
  const cardsRef = useRef<Item[]>([]);

  cardsRef.current = cards;

  const loadFeed = useCallback(async (offset: number) => {
    try {
      const items = await fetchFeed(offset);
      if (items.length === 0 && offset === 0) {
        setEmpty(true);
      } else {
        setCards(prev => (offset === 0 ? items : [...prev, ...items]));
      }
    } catch (err) {
      logger.error({ err: String(err), offset }, 'Feed load failed');
      if (cardsRef.current.length === 0) setEmpty(true);
      Alert.alert('Network Error', 'Unable to update feed at this moment.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed(0);
  }, [loadFeed]);

  const recordSwipe = useCallback(async (index: number, type: InteractionType) => {
    const item = cardsRef.current[index];
    if (!item) return;

    try {
      await postInteraction(item.id, type);
    } catch (err) {
      logger.error({ err: String(err), itemId: item.id, type }, 'Interaction post failed');
    }

    const remaining = cardsRef.current.length - (index + 1);
    if (remaining <= config.feed.prefetchThreshold) {
      loadFeed(cardsRef.current.length);
    }
  }, [loadFeed]);

  const reload = useCallback(() => {
    setLoading(true);
    setEmpty(false);
    setCards([]);
    loadFeed(0);
  }, [loadFeed]);

  const markEmpty = useCallback(() => setEmpty(true), []);
  const resetCards = useCallback(() => setCards([]), []);

  return { cards, loading, empty, reload, recordSwipe, markEmpty, resetCards };
}
