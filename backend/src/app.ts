import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { config, ItemStatus, InteractionType } from './config';

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
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    res.json(data || []);
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/v1/interactions', async (req, res) => {
  const { item_id, type } = req.body;
  const userId = DEMO_USER_ID;

  if (item_id == null || ![InteractionType.DISLIKE, InteractionType.LIKE].includes(type)) {
    res.status(400).json({ error: 'Invalid request. Required: item_id (number), type (0 or 1)' });
    return;
  }

  try {
    const { error } = await supabase
      .from('interactions')
      .insert({ user_id: userId, item_id, type });

    if (error) {
      if (error.code === '23505') {
        res.status(409).json({ error: 'Interaction already exists' });
        return;
      }
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    res.status(201).json({ success: true });
  } catch {
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
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    res.status(201).json(data);
  } catch {
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
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export { app };
