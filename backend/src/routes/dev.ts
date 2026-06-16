import { Router } from 'express';
import { supabase } from '../supabase';
import { logger } from '../logger';
// DEV: routes mounted only for dev/staging — remove before production
export const devRouter = Router();

devRouter.get('/v1/dev/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, display_name')
      .order('display_name');

    if (error) {
      logger.error({ error }, 'DEV users list failed');
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    res.json(data || []);
  } catch (err) {
    logger.error({ err }, 'DEV users list unexpected error');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

devRouter.delete('/v1/dev/clear', async (req, res) => {
  const userId = req.currentUserId;
  try {
    const { error } = await supabase
      .from('interactions')
      .delete()
      .eq('user_id', userId);

    if (error) {
      logger.error({ error }, 'DEV clear failed');
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    logger.info({ userId }, 'DEV clear: all interactions deleted');
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'DEV clear unexpected error');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
