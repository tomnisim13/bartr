import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, supabase } from '../app';
import { ItemStatus } from '../config';
import { DEMO_USER_ID } from '../constants';

const NEAR_USER = '00000000-0000-0000-0000-000000000080';
const FAR_USER = '00000000-0000-0000-0000-000000000081';
const NO_LOC_USER = '00000000-0000-0000-0000-000000000082';

// Tel Aviv coords
const USER_LAT = 32.08;
const USER_LNG = 34.78;

let nearItemId: number;
let farItemId: number;
let noLocItemId: number;

describe('GET /v1/feed (geo)', () => {
  beforeAll(async () => {
    // Set demo user location
    await supabase.from('user_locations').upsert({
      user_id: DEMO_USER_ID,
      location: `POINT(${USER_LNG} ${USER_LAT})`,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    // Near user: ~5km away
    await supabase.from('user_locations').upsert({
      user_id: NEAR_USER,
      location: `POINT(34.79 32.12)`,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    // Far user: ~300km away (Eilat)
    await supabase.from('user_locations').upsert({
      user_id: FAR_USER,
      location: `POINT(34.95 29.55)`,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    // Seed items
    const { data: nearData } = await supabase
      .from('items')
      .insert({ user_id: NEAR_USER, name: 'Near Item', points_value: 10, status: ItemStatus.AVAILABLE })
      .select('id').single();
    nearItemId = nearData!.id;

    const { data: farData } = await supabase
      .from('items')
      .insert({ user_id: FAR_USER, name: 'Far Item', points_value: 10, status: ItemStatus.AVAILABLE })
      .select('id').single();
    farItemId = farData!.id;

    const { data: noLocData } = await supabase
      .from('items')
      .insert({ user_id: NO_LOC_USER, name: 'No Location Item', points_value: 10, status: ItemStatus.AVAILABLE })
      .select('id').single();
    noLocItemId = noLocData!.id;
  });

  afterAll(async () => {
    await supabase.from('interactions').delete().in('item_id', [nearItemId, farItemId, noLocItemId]);
    await supabase.from('items').delete().in('id', [nearItemId, farItemId, noLocItemId]);
    await supabase.from('user_locations').delete().in('user_id', [NEAR_USER, FAR_USER, DEMO_USER_ID]);
  });

  it('returns nearby items and excludes far items', async () => {
    const res = await request(app)
      .get(`/v1/feed?latitude=${USER_LAT}&longitude=${USER_LNG}&radius_km=50`);

    expect(res.status).toBe(200);
    const ids = res.body.map((i: any) => i.id);
    expect(ids).toContain(nearItemId);
    expect(ids).not.toContain(farItemId);
  });

  it('excludes items from owners without location', async () => {
    const res = await request(app)
      .get(`/v1/feed?latitude=${USER_LAT}&longitude=${USER_LNG}&radius_km=50`);

    const ids = res.body.map((i: any) => i.id);
    expect(ids).not.toContain(noLocItemId);
  });

  it('includes distance_km in response', async () => {
    const res = await request(app)
      .get(`/v1/feed?latitude=${USER_LAT}&longitude=${USER_LNG}&radius_km=50`);

    const nearItem = res.body.find((i: any) => i.id === nearItemId);
    expect(nearItem).toBeDefined();
    expect(nearItem.distance_km).toBeGreaterThan(0);
    expect(nearItem.distance_km).toBeLessThan(50);
  });

  it('returns 400 when lat/lng missing', async () => {
    const res = await request(app).get('/v1/feed?limit=10');
    expect(res.status).toBe(400);
  });
});
