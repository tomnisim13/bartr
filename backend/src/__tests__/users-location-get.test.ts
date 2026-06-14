import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { app, supabase } from '../app';
import { DEMO_USER_ID } from '../constants';

describe('GET /v1/users/location', () => {
  beforeEach(async () => {
    await supabase.from('user_locations').delete().eq('user_id', DEMO_USER_ID);
  });

  afterAll(async () => {
    await supabase.from('user_locations').delete().eq('user_id', DEMO_USER_ID);
  });

  it('returns 404 when no location is stored', async () => {
    const res = await request(app).get('/v1/users/location');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'No stored location' });
  });

  it('returns 200 with parsed coords after an upsert', async () => {
    await request(app)
      .post('/v1/users/location')
      .send({ latitude: 32.08, longitude: 34.78 });

    const res = await request(app).get('/v1/users/location');
    expect(res.status).toBe(200);
    expect(res.body.latitude).toBeCloseTo(32.08, 4);
    expect(res.body.longitude).toBeCloseTo(34.78, 4);
    expect(typeof res.body.updated_at).toBe('string');
  });
});
