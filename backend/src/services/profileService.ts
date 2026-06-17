import { supabase } from '../supabase';
import { logger } from '../logger';
import { timed } from '../utils/timed';

export interface UserProfile {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  balance_points: number;
}

interface UserRow {
  display_name: string | null;
  avatar_url: string | null;
}

interface WalletRow {
  balance_points: number;
}

async function loadUser(userId: string): Promise<UserRow | null> {
  const { data, error } = await timed('db.users.findOne', { userId }, () =>
    supabase
      .from('users')
      .select('display_name, avatar_url')
      .eq('id', userId)
      .maybeSingle(),
  );

  if (error) {
    logger.error({ err: error, userId }, 'Profile: user lookup failed');
    throw new Error('profile_user_lookup_failed');
  }
  return (data as UserRow | null) ?? null;
}

async function loadWalletBalance(userId: string): Promise<number> {
  const { data, error } = await timed('db.wallets.balance', { userId }, () =>
    supabase
      .from('wallets')
      .select('balance_points')
      .eq('user_id', userId)
      .maybeSingle(),
  );

  if (error) {
    logger.error({ err: error, userId }, 'Profile: wallet lookup failed');
    throw new Error('profile_wallet_lookup_failed');
  }
  return (data as WalletRow | null)?.balance_points ?? 0;
}

export async function getProfile(userId: string): Promise<UserProfile> {
  const [user, balance] = await Promise.all([loadUser(userId), loadWalletBalance(userId)]);
  return {
    user_id: userId,
    display_name: user?.display_name ?? 'Anonymous',
    avatar_url: user?.avatar_url ?? null,
    balance_points: balance,
  };
}
