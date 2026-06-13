import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, supabase } from '../app';

const TEST_USER = '00000000-0000-0000-0000-000000000099';
const DEMO_USER = '00000000-0000-0000-0000-000000000001';

describe('GET /v1/feed', () => {
  let seededItemIds: number[] = [];

  beforeAll(async () => {
    const { data } = await supabase
      .from('items')
      .insert([
        { user_id: TEST_USER, name: 'Feed Test A', points_value: 10, status: 1 },
        { user_id: TEST_USER, name: 'Feed Test B', points_value: 20, status: 1 },
        { user_id: TEST_USER, name: 'Feed Test C', points_value: 30, status: 1 },
        { user_id: TEST_USER, name: 'Feed Test D', points_value: 40, status: 1 },
        { user_id: TEST_USER, name: 'Archived Item', points_value: 50, status: 3 },
        { user_id: DEMO_USER, name: 'Own Item', points_value: 60, status: 1 },
      ])
      .select('id');

    seededItemIds = (data || []).map((d) => d.id);
  });

  afterAll(async () => {
    if (seededItemIds.length) {
      await supabase.from('interactions').delete().in('item_id', seededItemIds);
      await supabase.from('items').delete().in('id', seededItemIds);
    }
  });

  it('returns only available items from other users', async () => {
    const res = await request(app).get('/v1/feed');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const names = res.body.map((i: any) => i.name);
    expect(names).not.toContain('Archived Item');
    expect(names).not.toContain('Own Item');
  });

  it('excludes already-interacted items', async () => {
    const targetId = seededItemIds[0];
    await supabase.from('interactions').insert({ user_id: DEMO_USER, item_id: targetId, type: 1 });

    const res = await request(app).get('/v1/feed');
    const ids = res.body.map((i: any) => i.id);
    expect(ids).not.toContain(targetId);
  });

  it('returns fewer items with higher offset', async () => {
    const page1 = await request(app).get('/v1/feed?limit=50&offset=0');
    const page2 = await request(app).get('/v1/feed?limit=50&offset=999');

    expect(page1.status).toBe(200);
    expect(page1.body.length).toBeGreaterThan(0);
    expect(page2.body.length).toBe(0);
  });
});
