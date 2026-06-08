import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

app.post('/items', async (req, res) => {
  const { name } = req.body;

  const { data, error } = await supabase
    .from('items')
    .insert({ name })
    .select();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json(data);
});

app.listen(3000, () => {
  console.log('Bartr backend running on http://localhost:3000');
});
