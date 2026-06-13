import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, supabase } from '../app';

const TEST_USER = '00000000-0000-0000-0000-000000000098';
const DEMO_USER = '00000000-0000-0000-0000-000000000001';

describe('POST /v1/interactions', () => {
  let itemId: number;

  beforeAll(async () => {
    const { data } = await supabase
      .from('items')
      .insert({ user_id: TEST_USER, name: 'Interaction Test Item', points_value: 10, status: 1 })
      .select('id')
      .single();
    itemId = data!.id;
  });

  afterAll(async () => {
    await supabase.from('interactions').delete().eq('item_id', itemId);
    await supabase.from('items').delete().eq('id', itemId);
  });

  it('creates an interaction successfully', async () => {
    const res = await request(app)
      .post('/v1/interactions')
      .send({ item_id: itemId, type: 1 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('returns 409 on duplicate interaction', async () => {
    const res = await request(app)
      .post('/v1/interactions')
      .send({ item_id: itemId, type: 1 });

    expect(res.status).toBe(409);
  });

  it('has exactly one row in DB after duplicate attempt', async () => {
    const { data } = await supabase
      .from('interactions')
      .select('id')
      .eq('user_id', DEMO_USER)
      .eq('item_id', itemId);

    expect(data).toHaveLength(1);
  });
});
