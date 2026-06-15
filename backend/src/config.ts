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
  feed: {
    limit: 20,
  },
  location: {
    DEFAULT_RADIUS_KM: 100,
    MAX_RADIUS_KM: 200,
    SIGNIFICANT_DISTANCE_CHANGE_METERS: 100,
  },
  // Debug visibility flags. INVARIANT: every flag here must be false in production.
  // Backend flags are env-var gated so prod stays safe without code edits.
  debug: {
    ENABLE_CLEAR_ALL_BUTTON: process.env.NODE_ENV !== 'production',
    SHOW_OWNER_DEBUG: process.env.SHOW_OWNER_DEBUG === 'true',
  },
};
