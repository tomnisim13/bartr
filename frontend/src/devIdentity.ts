import { config } from './config';

// Single source of truth for the dev-mode identity is config.dev.currentUserId.
// All API calls read this value at request time, so mutating it propagates
// automatically without a separate cache.

const listeners: Array<(id: string) => void> = [];

export function getDevUserId(): string {
  return config.dev.currentUserId;
}

export function setDevUserId(id: string): void {
  if (config.dev.currentUserId === id) return;
  config.dev.currentUserId = id;
  listeners.forEach(fn => fn(id));
}

export function onDevUserChange(fn: (id: string) => void): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}
