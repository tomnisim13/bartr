import { logger } from '../logger';

// Threshold for the "Slow query" warning. Tuned to match a relaxed local-dev
// expectation; production should be lower once latency targets are set.
export const SLOW_QUERY_MS = 300;

/**
 * Wraps an async DB call so any operation that exceeds SLOW_QUERY_MS gets a
 * structured warning. The wrapper is transparent: the caller still receives
 * the Supabase response (or thrown error) unchanged.
 */
export async function timed<T>(
  label: string,
  ctx: Record<string, unknown>,
  fn: () => PromiseLike<T>,
): Promise<T> {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    const ms = Date.now() - start;
    if (ms > SLOW_QUERY_MS) {
      logger.warn({ ...ctx, label, ms }, 'Slow query');
    }
  }
}
