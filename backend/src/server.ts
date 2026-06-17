import { app } from './app';
import { logger } from './logger';
import { config } from './config';

const PORT = Number(process.env.PORT) || 3000;

function describeSupabase(): string {
  const url = process.env.SUPABASE_URL ?? '';
  const match = url.match(/^https:\/\/([^.]+)\.supabase\.co/);
  return match ? `project=${match[1]}` : 'unset';
}

app.listen(PORT, () => {
  logger.info(
    {
      port: PORT,
      nodeEnv: process.env.NODE_ENV ?? 'development',
      supabase: describeSupabase(),
      debug: config.debug,
    },
    'Bartr backend started',
  );
});
