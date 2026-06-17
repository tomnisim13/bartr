import { supabase } from '../supabase';
import { logger } from '../logger';
import { STARTING_BALANCE_POINTS, TransactionType } from '../config';
import { timed } from '../utils/timed';

export interface Wallet {
  id: number;
  balance_points: number;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: number;
  wallet_id: number;
  type: TransactionType;
  amount: number;
  balance_after: number;
  reference_id: string | null;
  description: string | null;
  created_at: string;
}

async function findWallet(userId: string): Promise<Wallet | null> {
  const { data, error } = await timed('db.wallets.findOne', { userId }, () =>
    supabase
      .from('wallets')
      .select('id, balance_points, created_at, updated_at')
      .eq('user_id', userId)
      .maybeSingle(),
  );

  if (error) {
    logger.error({ err: error, userId }, 'Wallet lookup failed');
    throw new Error('wallet_lookup_failed');
  }
  return (data as Wallet | null) ?? null;
}

async function provisionWallet(userId: string): Promise<Wallet> {
  const { error: rpcError } = await timed('rpc.wallet_credit', { userId, type: TransactionType.SIGNUP_BONUS }, () =>
    supabase.rpc('wallet_credit', {
      p_user_id: userId,
      p_amount: STARTING_BALANCE_POINTS,
      p_type: TransactionType.SIGNUP_BONUS,
      p_description: 'Welcome bonus',
    }),
  );

  if (rpcError) {
    logger.error({ err: rpcError, userId }, 'Wallet provisioning RPC failed');
    throw new Error('wallet_provisioning_failed');
  }

  const wallet = await findWallet(userId);
  if (!wallet) {
    logger.error({ userId }, 'Wallet provisioning succeeded but row not found');
    throw new Error('wallet_provisioning_inconsistent');
  }

  logger.info(
    { userId, walletId: wallet.id, amount: STARTING_BALANCE_POINTS, type: TransactionType.SIGNUP_BONUS },
    'Wallet provisioned with signup bonus',
  );
  return wallet;
}

export async function getOrCreateWallet(userId: string): Promise<Wallet> {
  const existing = await findWallet(userId);
  if (existing) return existing;
  return provisionWallet(userId);
}

export async function listWalletTransactions(
  userId: string,
  limit: number,
  offset: number,
): Promise<WalletTransaction[]> {
  const wallet = await findWallet(userId);
  if (!wallet) return [];

  const { data, error } = await timed(
    'db.wallet_transactions.list',
    { userId, walletId: wallet.id, limit, offset },
    () =>
      supabase
        .from('wallet_transactions')
        .select('id, wallet_id, type, amount, balance_after, reference_id, description, created_at')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1),
  );

  if (error) {
    logger.error({ err: error, userId, walletId: wallet.id }, 'Wallet transactions query failed');
    throw new Error('wallet_transactions_query_failed');
  }

  return (data as WalletTransaction[] | null) ?? [];
}
