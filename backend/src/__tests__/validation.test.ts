import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app';

describe('POST /v1/interactions - validation', () => {
  it('rejects invalid type (3)', async () => {
    const res = await request(app)
      .post('/v1/interactions')
      .send({ item_id: 1, type: 3 });
    expect(res.status).toBe(400);
  });

  it('rejects negative type (-1)', async () => {
    const res = await request(app)
      .post('/v1/interactions')
      .send({ item_id: 1, type: -1 });
    expect(res.status).toBe(400);
  });

  it('rejects string type', async () => {
    const res = await request(app)
      .post('/v1/interactions')
      .send({ item_id: 1, type: 'foo' });
    expect(res.status).toBe(400);
  });

  it('rejects missing item_id', async () => {
    const res = await request(app)
      .post('/v1/interactions')
      .send({ type: 1 });
    expect(res.status).toBe(400);
  });
});
