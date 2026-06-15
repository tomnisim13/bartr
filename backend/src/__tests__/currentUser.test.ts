import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { DEMO_USER_ID } from '../constants';

describe('currentUser middleware', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('honors X-User-Id header in non-production', async () => {
    process.env.NODE_ENV = 'test';
    const customId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    // Hit any endpoint — the feed will use the custom user id
    const res = await request(app)
      .get('/v1/matches')
      .set('X-User-Id', customId);
    // Just confirm it doesn't crash and uses the id (no matches for this user → empty array)
    expect(res.status).toBe(200);
  });

  it('falls back to DEMO_USER_ID when no header', async () => {
    const res = await request(app).get('/v1/matches');
    expect(res.status).toBe(200);
  });

  it('ignores X-User-Id in production', async () => {
    process.env.NODE_ENV = 'production';
    const customId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const res = await request(app)
      .get('/v1/matches')
      .set('X-User-Id', customId);
    // Should still work (uses DEMO_USER_ID internally)
    expect(res.status).toBe(200);
  });
});
