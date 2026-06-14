import { Router } from 'express';
import { supabase } from '../supabase';
import { logger } from '../logger';
import { DEMO_USER_ID } from '../constants';

// DEV: routes mounted only for dev/staging — remove before production
export const devRouter = Router();

devRouter.delete('/v1/dev/clear', async (_req, res) => {
  try {
    const { error } = await supabase
      .from('interactions')
      .delete()
      .eq('user_id', DEMO_USER_ID);

    if (error) {
      logger.error({ error }, 'DEV clear failed');
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    logger.info({ userId: DEMO_USER_ID }, 'DEV clear: all interactions deleted');
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'DEV clear unexpected error');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
