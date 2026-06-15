import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Tests share a single Supabase DB and the hardcoded DEMO_USER_ID — running
    // files in parallel causes seed/cleanup races. Serialise file execution.
    fileParallelism: false,
    // Force debug flags off during tests regardless of local .env. dotenv won't
    // overwrite existing env vars, so vitest setting them first wins.
    env: {
      SHOW_OWNER_DEBUG: '',
    },
  },
});
