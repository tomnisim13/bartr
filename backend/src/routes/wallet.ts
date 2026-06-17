import { Router } from 'express';
import { logger } from '../logger';
import { getOrCreateWallet, listWalletTransactions } from '../services/walletService';

export const walletRouter = Router();

const MAX_TX_PAGE = 100;
const DEFAULT_TX_PAGE = 50;

function parsePage(req: { query: { limit?: unknown; offset?: unknown } }): { limit: number; offset: number } {
  const limit = Math.min(Number(req.query.limit) || DEFAULT_TX_PAGE, MAX_TX_PAGE);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  return { limit, offset };
}

walletRouter.get('/v1/wallet', async (req, res) => {
  const userId = req.currentUserId;
  try {
    const wallet = await getOrCreateWallet(userId);
    res.json(wallet);
  } catch (err) {
    logger.error({ err: String(err), userId }, 'Wallet endpoint failed');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

walletRouter.get('/v1/wallet/transactions', async (req, res) => {
  const userId = req.currentUserId;
  const { limit, offset } = parsePage(req);
  try {
    const txs = await listWalletTransactions(userId, limit, offset);
    res.json(txs);
  } catch (err) {
    logger.error({ err: String(err), userId, limit, offset }, 'Wallet transactions endpoint failed');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
