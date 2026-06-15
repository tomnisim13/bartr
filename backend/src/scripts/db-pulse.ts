import '../loadEnv';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

async function pulse() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase.from('items').select('id').limit(1);
  if (error) {
    console.error('[db:pulse] Failed:', error.message);
    process.exit(1);
  }
  console.log('[db:pulse] OK — Supabase is alive');
}

pulse();
