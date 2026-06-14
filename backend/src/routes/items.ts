import { Router } from 'express';
import { supabase } from '../supabase';
import { ItemStatus } from '../config';
import { logger } from '../logger';
import { DEMO_USER_ID } from '../constants';

export const itemsRouter = Router();

itemsRouter.post('/items', async (req, res) => {
  const { name } = req.body;

  try {
    const { data, error } = await supabase
      .from('items')
      .insert({ name, user_id: DEMO_USER_ID, points_value: 0, status: ItemStatus.AVAILABLE })
      .select();

    if (error) {
      logger.error({ error, name }, 'Item creation failed');
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    logger.info({ name, id: data?.[0]?.id }, 'Item created');
    res.status(201).json(data);
  } catch (err) {
    logger.error({ err, name }, 'Item creation unexpected error');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
