export enum ItemStatus {
  AVAILABLE = 1,
  TRADED = 2,
  ARCHIVED = 3,
}

export enum InteractionType {
  DISLIKE = 0,
  LIKE = 1,
}

export const config = {
  apiUrl: 'http://localhost:3000',
  feed: {
    limit: 20,
    prefetchThreshold: 5,
  },
  // DEV: development tools config — remove before production
  dev: {
    enableClearAll: true,
  },
};
