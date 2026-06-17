import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { fetchFeed, postInteraction, InteractionResult } from '../api';
import { InteractionType, config } from '../config';
import { logger } from '../logger';
import { Item } from '../types';

interface Coords {
  lat: number;
  lng: number;
}

interface UseFeedResult {
  cards: Item[];
  loading: boolean;
  empty: boolean;
  lastMatch: InteractionResult | null;
  reload: () => void;
  recordSwipe: (index: number, type: InteractionType) => Promise<void>;
  markEmpty: () => void;
  resetCards: () => void;
  clearLastMatch: () => void;
}

export function useFeed(coords: Coords | null): UseFeedResult {
  const [cards, setCards] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);
  const [lastMatch, setLastMatch] = useState<InteractionResult | null>(null);
  const cardsRef = useRef<Item[]>([]);
  const coordsRef = useRef<Coords | null>(coords);

  cardsRef.current = cards;
  coordsRef.current = coords;

  const loadFeed = useCallback(async (offset: number) => {
    const c = coordsRef.current;
    if (!c) {
      logger.warn({}, 'loadFeed: no coords available, skipping');
      setLoading(false);
      return;
    }

    try {
      const items = await fetchFeed(c.lat, c.lng, offset);
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
    if (coords) loadFeed(0);
  }, [coords?.lat, coords?.lng, loadFeed]);

  const recordSwipe = useCallback(async (index: number, type: InteractionType) => {
    const item = cardsRef.current[index];
    if (!item) return;

    try {
      const result = await postInteraction(item.id, type);
      if (result.is_match) {
        setLastMatch(result);
      }
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
  const clearLastMatch = useCallback(() => setLastMatch(null), []);

  return { cards, loading, empty, lastMatch, reload, recordSwipe, markEmpty, resetCards, clearLastMatch };
}
