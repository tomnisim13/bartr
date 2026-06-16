import { config } from './config';

let currentUserId = config.dev.currentUserId;
const listeners: Array<(id: string) => void> = [];

export function getDevUserId(): string {
  return currentUserId;
}

export function setDevUserId(id: string): void {
  currentUserId = id;
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
