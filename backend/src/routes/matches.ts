import { Router } from 'express';
import { supabase } from '../supabase';
import { logger } from '../logger';

export const matchesRouter = Router();

matchesRouter.get('/v1/matches', async (req, res) => {
  const userId = req.currentUserId;

  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error({ error, userId }, 'Matches query failed');
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    logger.info({ userId, count: (data || []).length }, 'Matches served');
    res.json(data || []);
  } catch (err) {
    logger.error({ err, userId }, 'Matches unexpected error');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
