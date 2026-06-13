import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    rpc: () => { throw new Error('DB crashed'); },
    from: () => ({
      insert: () => ({ select: () => ({ data: null, error: { message: 'fail' } }) }),
    }),
  }),
}));

import { app } from '../app';

describe('Error resilience', () => {
  it('returns clean 500 when DB throws on feed', async () => {
    const res = await request(app).get('/v1/feed');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal Server Error' });
    expect(res.body.stack).toBeUndefined();
  });
});
