import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, supabase } from '../app';
import { DEMO_USER_ID } from '../constants';
import { ItemStatus, InteractionType } from '../config';

const USER_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

let itemFromA: number;
let itemFromB: number;
let itemFromDemo: number;

beforeAll(async () => {
  // Seed items for each user
  const { data: dA } = await supabase
    .from('items')
    .insert({ user_id: USER_A, name: 'Test Item A', points_value: 10, status: ItemStatus.AVAILABLE })
    .select('id')
    .single();
  itemFromA = dA!.id;

  const { data: dB } = await supabase
    .from('items')
    .insert({ user_id: USER_B, name: 'Test Item B', points_value: 10, status: ItemStatus.AVAILABLE })
    .select('id')
    .single();
  itemFromB = dB!.id;

  const { data: dDemo } = await supabase
    .from('items')
    .insert({ user_id: DEMO_USER_ID, name: 'Test Item Demo', points_value: 10, status: ItemStatus.AVAILABLE })
    .select('id')
    .single();
  itemFromDemo = dDemo!.id;
});

afterAll(async () => {
  await supabase.from('matches').delete().or(`user_one_id.eq.${USER_A},user_one_id.eq.${USER_B},user_one_id.eq.${DEMO_USER_ID}`);
  await supabase.from('interactions').delete().or(`user_id.eq.${USER_A},user_id.eq.${USER_B},user_id.eq.${DEMO_USER_ID}`);
  await supabase.from('items').delete().in('id', [itemFromA, itemFromB, itemFromDemo]);
});

describe('Feature 4: Match Engine', () => {
  it('F4-T1: mutual likes create a match', async () => {
    // User A likes Demo's item
    const r1 = await request(app)
      .post('/v1/interactions')
      .set('X-User-Id', USER_A)
      .send({ item_id: itemFromDemo, type: InteractionType.LIKE });
    expect(r1.status).toBe(201);
    expect(r1.body.is_match).toBe(false);

    // Demo likes A's item → match
    const r2 = await request(app)
      .post('/v1/interactions')
      .set('X-User-Id', DEMO_USER_ID)
      .send({ item_id: itemFromA, type: InteractionType.LIKE });
    expect(r2.status).toBe(201);
    expect(r2.body.is_match).toBe(true);
    expect(r2.body.match_id).toBeGreaterThan(0);
  });

  it('F4-T2: like + dislike does not create a match', async () => {
    // User B likes Demo's item
    const r1 = await request(app)
      .post('/v1/interactions')
      .set('X-User-Id', USER_B)
      .send({ item_id: itemFromDemo, type: InteractionType.LIKE });
    expect(r1.status).toBe(201);

    // Demo DISLIKES B's item → no match
    const r2 = await request(app)
      .post('/v1/interactions')
      .set('X-User-Id', DEMO_USER_ID)
      .send({ item_id: itemFromB, type: InteractionType.DISLIKE });
    expect(r2.status).toBe(201);
    expect(r2.body.is_match).toBe(false);
  });

  it('F4-T3: canonical ordering — user_one_id < user_two_id', async () => {
    // Match from T1: DEMO_USER_ID and USER_A
    const { data } = await supabase
      .from('matches')
      .select('user_one_id, user_two_id')
      .or(`user_one_id.eq.${DEMO_USER_ID},user_two_id.eq.${DEMO_USER_ID}`)
      .limit(1)
      .single();

    expect(data).not.toBeNull();
    expect(data!.user_one_id < data!.user_two_id).toBe(true);
  });

  it('F4-T4: duplicate interaction returns 409, no extra match row', async () => {
    const r = await request(app)
      .post('/v1/interactions')
      .set('X-User-Id', DEMO_USER_ID)
      .send({ item_id: itemFromA, type: InteractionType.LIKE });
    expect(r.status).toBe(409);

    // Still only one match row
    const { data } = await supabase
      .from('matches')
      .select('id')
      .or(`user_one_id.eq.${DEMO_USER_ID},user_two_id.eq.${DEMO_USER_ID}`);
    expect(data!.length).toBe(1);
  });

  it('F4-T5: GET /v1/matches returns match for both users', async () => {
    const rDemo = await request(app)
      .get('/v1/matches')
      .set('X-User-Id', DEMO_USER_ID);
    expect(rDemo.status).toBe(200);
    expect(rDemo.body.length).toBeGreaterThanOrEqual(1);

    const rA = await request(app)
      .get('/v1/matches')
      .set('X-User-Id', USER_A);
    expect(rA.status).toBe(200);
    expect(rA.body.length).toBeGreaterThanOrEqual(1);

    // User B should have no matches
    const rB = await request(app)
      .get('/v1/matches')
      .set('X-User-Id', USER_B);
    expect(rB.status).toBe(200);
    expect(rB.body.length).toBe(0);
  });
});
