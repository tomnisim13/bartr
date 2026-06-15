-- DEV: Seed synthetic users for match testing.
-- Both users have items in Tel Aviv (within 100km of DEMO_USER_ID).
-- Safe to re-run: ON CONFLICT guards on all inserts.

-- User A: Yossi
INSERT INTO items (user_id, name, description, points_value, status, image_url)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Acoustic Guitar',
  'Yamaha F310, great condition, minor scratches on body',
  120,
  1,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO user_locations (user_id, location, updated_at)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  ST_MakePoint(34.78, 32.08)::geography,
  now()
) ON CONFLICT (user_id) DO UPDATE SET location = EXCLUDED.location, updated_at = now();

-- User B: Dani
INSERT INTO items (user_id, name, description, points_value, status, image_url)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'Leather Jacket',
  'Size M, black, barely worn',
  90,
  1,
  NULL
) ON CONFLICT DO NOTHING;

INSERT INTO user_locations (user_id, location, updated_at)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  ST_MakePoint(34.77, 32.07)::geography,
  now()
) ON CONFLICT (user_id) DO UPDATE SET location = EXCLUDED.location, updated_at = now();
