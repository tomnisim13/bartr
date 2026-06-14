import { Router } from 'express';
import { supabase } from '../supabase';
import { config } from '../config';
import { logger } from '../logger';
import { DEMO_USER_ID } from '../constants';

export const feedRouter = Router();

feedRouter.get('/v1/feed', async (req, res) => {
  const limit = Number(req.query.limit) || config.feed.limit;
  const offset = Number(req.query.offset) || 0;
  const userId = DEMO_USER_ID;

  try {
    const { data, error } = await supabase.rpc('get_feed', {
      current_user_id: userId,
      feed_limit: limit,
      feed_offset: offset,
    });

    if (error) {
      logger.error({ error, userId, limit, offset }, 'Feed RPC failed');
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    logger.info({ userId, count: (data || []).length, offset }, 'Feed served');
    res.json(data || []);
  } catch (err) {
    logger.error({ err, userId }, 'Feed unexpected error');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
