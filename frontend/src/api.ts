import { config, InteractionType } from './config';
import { logger } from './logger';
import { Item } from './types';

export async function fetchFeed(lat: number, lng: number, offset = 0, radiusKm?: number): Promise<Item[]> {
  const radius = radiusKm ?? config.location.DEFAULT_RADIUS_KM;
  const url = `${config.apiUrl}/v1/feed?latitude=${lat}&longitude=${lng}&radius_km=${radius}&limit=${config.feed.limit}&offset=${offset}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Network Error. Unable to update feed at this moment.');
  return response.json();
}

export async function postInteraction(itemId: number, type: InteractionType): Promise<void> {
  const response = await fetch(`${config.apiUrl}/v1/interactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_id: itemId, type }),
  });
  if (!response.ok) throw new Error('Failed to record interaction');
}

export async function getLastLocation(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const response = await fetch(`${config.apiUrl}/v1/users/location`);
    if (response.status === 404) return null;
    if (!response.ok) {
      logger.warn({ status: response.status }, 'getLastLocation: non-OK response');
      return null;
    }
    return response.json();
  } catch (err) {
    logger.error({ err: String(err) }, 'getLastLocation: network failure');
    return null;
  }
}

export async function postLocation(lat: number, lng: number): Promise<void> {
  const response = await fetch(`${config.apiUrl}/v1/users/location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude: lat, longitude: lng }),
  });
  if (!response.ok) throw new Error('Failed to post location');
}

// DEV: resets all interactions for fresh start — remove before production
export async function clearAllInteractions(): Promise<void> {
  const response = await fetch(`${config.apiUrl}/v1/dev/clear`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to clear data');
}
