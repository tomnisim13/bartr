import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { config, ItemStatus, InteractionType } from './config';
import { logger } from './logger';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// DEV: hardcoded user until auth is implemented
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

app.get('/v1/feed', async (req, res) => {
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

app.post('/v1/interactions', async (req, res) => {
  const { item_id, type } = req.body;
  const userId = DEMO_USER_ID;

  if (item_id == null || ![InteractionType.DISLIKE, InteractionType.LIKE].includes(type)) {
    logger.warn({ item_id, type }, 'Interaction rejected: invalid input');
    res.status(400).json({ error: 'Invalid request. Required: item_id (number), type (0 or 1)' });
    return;
  }

  try {
    const { error } = await supabase
      .from('interactions')
      .insert({ user_id: userId, item_id, type });

    if (error) {
      if (error.code === '23505') {
        logger.warn({ userId, item_id }, 'Duplicate interaction attempted');
        res.status(409).json({ error: 'Interaction already exists' });
        return;
      }
      logger.error({ error, userId, item_id }, 'Interaction insert failed');
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    logger.info({ userId, item_id, type }, 'Interaction recorded');
    res.status(201).json({ success: true });
  } catch (err) {
    logger.error({ err, userId, item_id }, 'Interaction unexpected error');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/items', async (req, res) => {
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

// DEV: clears all interactions for fresh feed — remove before production
app.delete('/v1/dev/clear', async (_req, res) => {
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

export { app };
