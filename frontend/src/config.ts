export enum ItemStatus {
  AVAILABLE = 1,
  TRADED = 2,
  ARCHIVED = 3,
}

export enum InteractionType {
  DISLIKE = 0,
  LIKE = 1,
}

export const SRID_WGS84 = 4326;

export const config = {
  apiUrl: 'http://localhost:3000',
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
    SHOW_OWNER_DEBUG: true,
  },
};
