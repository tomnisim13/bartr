import { config, InteractionType } from './config';
import { logger } from './logger';
import { Item, Match, UserProfile, WalletTransaction } from './types';

export interface InteractionResult {
  success: boolean;
  is_match: boolean;
  match_id?: number;
}

function defaultHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-User-Id': config.dev.currentUserId,
  };
}

export async function fetchFeed(lat: number, lng: number, offset = 0, radiusKm?: number): Promise<Item[]> {
  const radius = radiusKm ?? config.location.DEFAULT_RADIUS_KM;
  const url = `${config.apiUrl}/v1/feed?latitude=${lat}&longitude=${lng}&radius_km=${radius}&limit=${config.feed.limit}&offset=${offset}`;
  const response = await fetch(url, { headers: { 'X-User-Id': config.dev.currentUserId } });
  if (!response.ok) throw new Error('Network Error. Unable to update feed at this moment.');
  return response.json();
}

export async function postInteraction(itemId: number, type: InteractionType): Promise<InteractionResult> {
  const response = await fetch(`${config.apiUrl}/v1/interactions`, {
    method: 'POST',
    headers: defaultHeaders(),
    body: JSON.stringify({ item_id: itemId, type }),
  });
  if (response.status === 409) return { success: false, is_match: false };
  if (!response.ok) throw new Error('Failed to record interaction');
  return response.json();
}

export async function getLastLocation(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const response = await fetch(`${config.apiUrl}/v1/users/location`, {
      headers: { 'X-User-Id': config.dev.currentUserId },
    });
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
    headers: defaultHeaders(),
    body: JSON.stringify({ latitude: lat, longitude: lng }),
  });
  if (!response.ok) throw new Error('Failed to post location');
}

// DEV: resets all interactions for fresh start — remove before production
export async function clearAllInteractions(): Promise<void> {
  const response = await fetch(`${config.apiUrl}/v1/dev/clear`, {
    method: 'DELETE',
    headers: { 'X-User-Id': config.dev.currentUserId },
  });
  if (!response.ok) throw new Error('Failed to clear data');
}

export async function fetchMatches(): Promise<Match[]> {
  const response = await fetch(`${config.apiUrl}/v1/matches`, {
    headers: { 'X-User-Id': config.dev.currentUserId },
  });
  if (!response.ok) throw new Error('Failed to fetch matches');
  return response.json();
}

export interface DevUser {
  id: string;
  display_name: string;
}

export async function fetchDevUsers(): Promise<DevUser[]> {
  const response = await fetch(`${config.apiUrl}/v1/dev/users`, {
    headers: { 'X-User-Id': config.dev.currentUserId },
  });
  if (!response.ok) throw new Error('Failed to fetch dev users');
  return response.json();
}

export async function fetchProfile(): Promise<UserProfile> {
  const response = await fetch(`${config.apiUrl}/v1/users/profile`, {
    headers: { 'X-User-Id': config.dev.currentUserId },
  });
  if (!response.ok) throw new Error('Failed to fetch profile');
  return response.json();
}

export async function fetchWallet(): Promise<{ id: number; balance_points: number }> {
  const response = await fetch(`${config.apiUrl}/v1/wallet`, {
    headers: { 'X-User-Id': config.dev.currentUserId },
  });
  if (!response.ok) throw new Error('Failed to fetch wallet');
  return response.json();
}

export async function fetchTransactions(limit = 50, offset = 0): Promise<WalletTransaction[]> {
  const response = await fetch(`${config.apiUrl}/v1/wallet/transactions?limit=${limit}&offset=${offset}`, {
    headers: { 'X-User-Id': config.dev.currentUserId },
  });
  if (!response.ok) throw new Error('Failed to fetch transactions');
  return response.json();
}
