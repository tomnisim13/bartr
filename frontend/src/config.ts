import Constants from 'expo-constants';

export enum ItemStatus {
  AVAILABLE = 1,
  TRADED = 2,
  ARCHIVED = 3,
}

export enum InteractionType {
  DISLIKE = 0,
  LIKE = 1,
}

// Mirrors backend/src/config.ts -> enum TransactionType.
// Keep numeric values aligned with the SQL CHECK constraint in 013_wallet_type_check.sql.
export enum TransactionType {
  SIGNUP_BONUS = 1,
  MATCH_BONUS = 2,
  ITEM_TRADE_DEBIT = 3,
  ITEM_TRADE_CREDIT = 4,
  MANUAL_ADJUSTMENT = 99,
}

export const SRID_WGS84 = 4326;

const API_PORT = 3000;

// Derive the LAN IP of the Mac running Metro so physical devices reach the
// backend without manual edits. Falls back to localhost on simulators where
// hostUri is unavailable.
function resolveDevApiUrl(): string {
  const hostUri =
    (Constants.expoConfig as { hostUri?: string } | null)?.hostUri ??
    (Constants as unknown as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } })
      .manifest2?.extra?.expoGo?.debuggerHost ??
    (Constants as unknown as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost;
  const host = hostUri?.split(':')[0];
  return host ? `http://${host}:${API_PORT}` : `http://localhost:${API_PORT}`;
}

export const config = {
  apiUrl: __DEV__ ? resolveDevApiUrl() : 'https://api.bartr.example',
  feed: {
    limit: 20,
    prefetchThreshold: 5,
  },
  location: {
    DEFAULT_RADIUS_KM: 100,
    MAX_RADIUS_KM: 200,
    SIGNIFICANT_DISTANCE_CHANGE_METERS: 100,
  },
  // Identity bootstrap (replaced by auth in production)
  dev: {
    currentUserId: '00000000-0000-0000-0000-000000000001',
  },
  // Debug visibility flags. INVARIANT: every flag here must be false in production.
  debug: {
    ENABLE_CLEAR_ALL_BUTTON: true,
    ENABLE_SWITCH_USER: true,
    SHOW_OWNER_DEBUG: true,
  },
};
