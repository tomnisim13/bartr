import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, supabase } from '../app';

const USER_W = '00000000-0000-0000-0000-000000000099';

describe('Feature 5: Wallet', () => {
  beforeAll(async () => {
    // Cleanup from prior runs
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', USER_W)
      .maybeSingle();

    if (wallet) {
      await supabase.from('wallet_transactions').delete().eq('wallet_id', wallet.id);
      await supabase.from('wallets').delete().eq('user_id', USER_W);
    }
  });

  it('F5-T1: GET /v1/wallet creates wallet with signup bonus', async () => {
    const res = await request(app)
      .get('/v1/wallet')
      .set('X-User-Id', USER_W);

    expect(res.status).toBe(200);
    expect(res.body.balance_points).toBe(100);
  });

  it('F5-T2: GET /v1/wallet is idempotent', async () => {
    const res = await request(app)
      .get('/v1/wallet')
      .set('X-User-Id', USER_W);

    expect(res.status).toBe(200);
    expect(res.body.balance_points).toBe(100);
  });

  it('F5-T3: GET /v1/wallet/transactions returns signup bonus tx', async () => {
    const res = await request(app)
      .get('/v1/wallet/transactions')
      .set('X-User-Id', USER_W);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].type).toBe(1); // SIGNUP_BONUS
    expect(res.body[0].amount).toBe(100);
  });

  it('F5-T4: GET /v1/users/profile returns balance', async () => {
    const res = await request(app)
      .get('/v1/users/profile')
      .set('X-User-Id', USER_W);

    expect(res.status).toBe(200);
    expect(res.body.user_id).toBe(USER_W);
    expect(res.body.balance_points).toBe(100);
    expect(res.body.display_name).toBe('Anonymous');
  });
});
