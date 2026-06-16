import { Router } from 'express';
import { supabase } from '../supabase';
import { logger } from '../logger';

export const walletRouter = Router();

export enum TransactionType {
  SIGNUP_BONUS = 1,
  MATCH_BONUS = 2,
  ITEM_TRADE_DEBIT = 3,
  ITEM_TRADE_CREDIT = 4,
  MANUAL_ADJUSTMENT = 99,
}

walletRouter.get('/v1/wallet', async (req, res) => {
  const userId = req.currentUserId;

  try {
    // Get or create wallet
    const { data: existing } = await supabase
      .from('wallets')
      .select('id, balance_points, created_at, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      res.json(existing);
      return;
    }

    // Create via credit RPC (signup bonus)
    const { data, error } = await supabase.rpc('wallet_credit', {
      p_user_id: userId,
      p_amount: 100,
      p_type: TransactionType.SIGNUP_BONUS,
      p_description: 'Welcome bonus',
    });

    if (error) {
      logger.error({ error, userId }, 'Wallet creation failed');
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    res.json({ id: row.wallet_id, balance_points: row.new_balance, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  } catch (err) {
    logger.error({ err, userId }, 'Wallet unexpected error');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

walletRouter.get('/v1/wallet/transactions', async (req, res) => {
  const userId = req.currentUserId;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const offset = Number(req.query.offset) || 0;

  try {
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!wallet) {
      res.json([]);
      return;
    }

    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('wallet_id', wallet.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error({ error, userId }, 'Wallet transactions query failed');
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    res.json(data || []);
  } catch (err) {
    logger.error({ err, userId }, 'Wallet transactions unexpected error');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
