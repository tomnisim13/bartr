import { config, InteractionType } from './config';
import { Item } from './types';

export async function fetchFeed(offset = 0): Promise<Item[]> {
  const response = await fetch(
    `${config.apiUrl}/v1/feed?limit=${config.feed.limit}&offset=${offset}`
  );
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

// DEV: resets all interactions for fresh start — remove before production
export async function clearAllInteractions(): Promise<void> {
  const response = await fetch(`${config.apiUrl}/v1/dev/clear`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to clear data');
}
