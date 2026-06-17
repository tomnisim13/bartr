-- =============================================================================
-- bartr — consolidated DEV seed data
-- Run this AFTER schema.sql on a fresh dev/staging Supabase project.
-- Never run in production.
-- Sources:
--   002_core_swiping.sql         8 production-flavoured demo items (URLs swapped)
--   003_update_seed_local_images +2 items + local:// image URIs
--   006_seed_match_users.dev.sql Yossi, Dani items + locations
--   008_owner_debug.dev.sql      user_profiles, dev locations, dev items, get_feed_debug RPC
--   012_users_table.sql          INSERTs into users (the trigger auto-creates wallets w/ 100pt bonus)
--   011_wallets_seed.dev.sql     INTENTIONALLY OMITTED — duplicates the trigger's signup bonus.
-- =============================================================================


-- ----- Dev users ------------------------------------------------------------
-- The trg_user_created trigger fires once per row, granting each user a wallet
-- with the SIGNUP_BONUS via wallet_credit(). Re-running this block is a no-op
-- thanks to ON CONFLICT.
INSERT INTO users (id, display_name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Demo User'),
  ('00000000-0000-0000-0000-000000000002', 'Seed User 2'),
  ('00000000-0000-0000-0000-000000000003', 'Seed User 3'),
  ('00000000-0000-0000-0000-000000000004', 'Seed User 4'),
  ('00000000-0000-0000-0000-000000000005', 'Seed User 5'),
  ('11111111-1111-1111-1111-111111111111', 'Tom'),
  ('22222222-2222-2222-2222-222222222222', 'Omer'),
  ('33333333-3333-3333-3333-333333333333', 'Ido'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Yossi'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Dani')
ON CONFLICT (id) DO NOTHING;


-- ----- Dev locations (Tel Aviv area) ----------------------------------------
-- All seed items inherit their location from the owner's row here. Without
-- these rows, get_feed (which JOINs user_locations) will return zero items.
INSERT INTO user_locations (user_id, location, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001', ST_MakePoint(34.78, 32.08)::geography, now()),
  ('00000000-0000-0000-0000-000000000002', ST_MakePoint(34.78, 32.08)::geography, now()),
  ('00000000-0000-0000-0000-000000000003', ST_MakePoint(34.79, 32.09)::geography, now()),
  ('00000000-0000-0000-0000-000000000004', ST_MakePoint(34.77, 32.07)::geography, now()),
  ('00000000-0000-0000-0000-000000000005', ST_MakePoint(34.80, 32.10)::geography, now()),
  ('11111111-1111-1111-1111-111111111111', ST_MakePoint(34.78, 32.08)::geography, now()),
  ('22222222-2222-2222-2222-222222222222', ST_MakePoint(34.79, 32.09)::geography, now()),
  ('33333333-3333-3333-3333-333333333333', ST_MakePoint(34.77, 32.07)::geography, now()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ST_MakePoint(34.78, 32.08)::geography, now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', ST_MakePoint(34.77, 32.07)::geography, now())
ON CONFLICT (user_id) DO UPDATE
  SET location = EXCLUDED.location, updated_at = now();


-- ----- Dev items ------------------------------------------------------------
-- ItemStatus literal: 1 = AVAILABLE.
-- NOTE: items.id is auto-generated and there is no unique key for de-dup.
-- Re-running this block on a non-empty DB will create duplicate rows.
-- For a clean reset, TRUNCATE items, interactions, matches first.
INSERT INTO items (user_id, name, description, points_value, status, image_url) VALUES
  ('00000000-0000-0000-0000-000000000002', 'Classic Fender Guitar',  'Great condition, comes with a padded gig bag and brand new D''Addario strings.', 150, 1, 'local://guitar'),
  ('00000000-0000-0000-0000-000000000002', 'MacBook Pro 2021',       '14-inch M1 Pro, 16GB RAM, 512GB SSD. Minor scratch on bottom.',                  200, 1, 'local://macbook'),
  ('00000000-0000-0000-0000-000000000003', 'Vintage Leather Jacket', 'Authentic 1970s brown leather. Size M. Broken in beautifully.',                   80, 1, 'local://jacket'),
  ('00000000-0000-0000-0000-000000000003', 'Sony WH-1000XM5',        'Noise cancelling headphones. Like new, barely used. Includes case.',             100, 1, 'local://headphones'),
  ('00000000-0000-0000-0000-000000000004', 'Mountain Bike - Trek',   'Trek Marlin 7, size large. New tires, recently serviced.',                       180, 1, 'local://bike'),
  ('00000000-0000-0000-0000-000000000004', 'Nintendo Switch OLED',   'White model with 3 games. Perfect condition, barely played.',                    120, 1, 'local://switch'),
  ('00000000-0000-0000-0000-000000000005', 'Canon EOS R6',           'Full-frame mirrorless camera body only. 15k shutter count.',                     250, 1, 'local://camera'),
  ('00000000-0000-0000-0000-000000000005', 'Standing Desk - Uplift', 'Electric sit-stand desk, 60x30 bamboo top. Includes cable tray.',                130, 1, 'local://desk'),
  ('00000000-0000-0000-0000-000000000002', 'Custom Skateboard',      'Element deck with Bones Swiss bearings and Spitfire wheels. Well loved but rides smooth.', 60, 1, 'local://skateboard'),
  ('00000000-0000-0000-0000-000000000003', 'Mechanical Keyboard',    'Keychron Q1 with Gateron Brown switches. Hot-swappable, aluminum frame.',         90, 1, 'local://keyboard'),
  -- F4 match-engine seed users
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Acoustic Guitar',        'Yamaha F310, great condition, minor scratches on body',                           120, 1, NULL),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Leather Jacket',         'Size M, black, barely worn',                                                       90, 1, NULL),
  -- Owner-debug devs
  ('11111111-1111-1111-1111-111111111111', 'Tom Mountain Bike',      'Trek 4500, 26"',                                                                  180, 1, NULL),
  ('22222222-2222-2222-2222-222222222222', 'Omer Espresso Machine',  'Breville Bambino, like new',                                                      220, 1, NULL),
  ('33333333-3333-3333-3333-333333333333', 'Ido Vinyl Collection',   '40 LPs, mostly 70s rock',                                                         140, 1, NULL);


-- ----- Owner Display Debug Mode (SHOW_OWNER_DEBUG) --------------------------
-- DEV-only: separate profile table + RPC variant that joins display_name onto
-- the feed. The feed.ts route picks between get_feed and get_feed_debug based
-- on config.debug.SHOW_OWNER_DEBUG.
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id       UUID PRIMARY KEY,
  display_name  TEXT NOT NULL
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow all" ON user_profiles;
CREATE POLICY "allow all" ON user_profiles FOR ALL USING (true);

INSERT INTO user_profiles (user_id, display_name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Tom'),
  ('22222222-2222-2222-2222-222222222222', 'Omer'),
  ('33333333-3333-3333-3333-333333333333', 'Ido'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Yossi'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Dani')
ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name;


CREATE OR REPLACE FUNCTION get_feed_debug(
  current_user_id UUID,
  user_lat        DOUBLE PRECISION,
  user_lng        DOUBLE PRECISION,
  radius_km       INT,
  feed_limit      INT,
  feed_offset     INT
) RETURNS TABLE (
  id                  BIGINT,
  user_id             UUID,
  name                VARCHAR,
  description         TEXT,
  points_value        INT,
  status              SMALLINT,
  image_url           TEXT,
  created_at          TIMESTAMPTZ,
  distance_km         DOUBLE PRECISION,
  owner_display_name  TEXT
) LANGUAGE sql STABLE AS $func$
  SELECT
    i.id, i.user_id, i.name, i.description, i.points_value, i.status,
    i.image_url, i.created_at,
    ST_Distance(ul.location, ST_MakePoint(user_lng, user_lat)::geography) / 1000.0 AS distance_km,
    up.display_name AS owner_display_name
  FROM items i
  JOIN user_locations ul ON ul.user_id = i.user_id
  LEFT JOIN user_profiles up ON up.user_id = i.user_id
  WHERE i.status = 1                       -- ItemStatus.AVAILABLE
    AND i.user_id != current_user_id
    AND NOT EXISTS (
      SELECT 1 FROM interactions x
      WHERE x.user_id = current_user_id AND x.item_id = i.id
    )
    AND ST_DWithin(ul.location, ST_MakePoint(user_lng, user_lat)::geography, radius_km * 1000)
  ORDER BY distance_km ASC
  LIMIT feed_limit OFFSET feed_offset;
$func$;
