import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app, supabase } from '../app';
import { DEMO_USER_ID } from '../constants';

describe('POST /v1/users/location', () => {
  afterAll(async () => {
    await supabase.from('user_locations').delete().eq('user_id', DEMO_USER_ID);
  });

  it('rejects invalid latitude (> 90)', async () => {
    const res = await request(app)
      .post('/v1/users/location')
      .send({ latitude: 91, longitude: 34 });
    expect(res.status).toBe(400);
  });

  it('rejects invalid longitude (> 180)', async () => {
    const res = await request(app)
      .post('/v1/users/location')
      .send({ latitude: 32, longitude: 181 });
    expect(res.status).toBe(400);
  });

  it('rejects non-numeric values', async () => {
    const res = await request(app)
      .post('/v1/users/location')
      .send({ latitude: 'abc', longitude: 34 });
    expect(res.status).toBe(400);
  });

  it('rejects missing fields', async () => {
    const res = await request(app)
      .post('/v1/users/location')
      .send({});
    expect(res.status).toBe(400);
  });

  it('upserts location successfully', async () => {
    const res = await request(app)
      .post('/v1/users/location')
      .send({ latitude: 32.08, longitude: 34.78 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('upsert is idempotent — still 1 row after second post', async () => {
    await request(app)
      .post('/v1/users/location')
      .send({ latitude: 32.09, longitude: 34.79 });

    const { data } = await supabase
      .from('user_locations')
      .select('user_id')
      .eq('user_id', DEMO_USER_ID);

    expect(data).toHaveLength(1);
  });
});
