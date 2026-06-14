import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { clearAllInteractions } from '../api';
import { logger } from '../logger';

interface UseClearAllOptions {
  onCleared: () => void;
  confirm?: boolean;
}

export function useClearAll({ onCleared, confirm = false }: UseClearAllOptions) {
  const [clearing, setClearing] = useState(false);

  const performClear = useCallback(async () => {
    setClearing(true);
    try {
      await clearAllInteractions();
      logger.info({}, 'DEV clear: succeeded');
      Alert.alert('Done', 'All interactions cleared!', [
        { text: 'OK', onPress: onCleared },
      ]);
    } catch (err) {
      logger.error({ err: String(err) }, 'DEV clear: failed');
      Alert.alert('Error', 'Failed to clear data. Check backend is running.');
    } finally {
      setClearing(false);
    }
  }, [onCleared]);

  const trigger = useCallback(() => {
    if (!confirm) {
      performClear();
      return;
    }
    Alert.alert('Clear All', 'Reset all interactions and start fresh?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: performClear },
    ]);
  }, [confirm, performClear]);

  return { clearing, trigger };
}
