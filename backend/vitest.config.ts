import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Tests share a single Supabase DB and the hardcoded DEMO_USER_ID — running
    // files in parallel causes seed/cleanup races. Serialise file execution.
    fileParallelism: false,
  },
});
