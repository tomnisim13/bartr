-- DEV ONLY: Owner Display Debug Mode (SHOW_OWNER_DEBUG)
-- Creates user_profiles, seeds Tom/Omer/Ido (+ Yossi/Dani for parity with F4 seed),
-- gives each new dev profile an item + user_locations row so they appear in the
-- DEMO_USER_ID feed, and adds a get_feed_debug RPC that joins owner display name.
-- Production get_feed RPC is intentionally untouched (SRP).
--
-- File suffix .dev.sql — never apply in production.

-- 1. user_profiles table (separate from auth.users — no admin schema writes)
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY,
  display_name TEXT NOT NULL
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow all" ON user_profiles;
CREATE POLICY "allow all" ON user_profiles FOR ALL USING (true);

-- 2. Seed developer profiles
INSERT INTO user_profiles (user_id, display_name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Tom'),
  ('22222222-2222-2222-2222-222222222222', 'Omer'),
  ('33333333-3333-3333-3333-333333333333', 'Ido'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Yossi'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Dani')
ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name;

-- 3. Locations for all dev users including DEMO (Tel Aviv area)
INSERT INTO user_locations (user_id, location, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000001', ST_MakePoint(34.78, 32.08)::geography, now()),
  ('11111111-1111-1111-1111-111111111111', ST_MakePoint(34.78, 32.08)::geography, now()),
  ('22222222-2222-2222-2222-222222222222', ST_MakePoint(34.79, 32.09)::geography, now()),
  ('33333333-3333-3333-3333-333333333333', ST_MakePoint(34.77, 32.07)::geography, now())
ON CONFLICT (user_id) DO UPDATE
  SET location = EXCLUDED.location, updated_at = now();

-- 4. One available item per new dev profile so the badge renders in the swiper feed.
--    DB assigns the IDs (no hardcoded item ids — F4 convention).
INSERT INTO items (user_id, name, description, points_value, status, image_url) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Tom Mountain Bike',     'Trek 4500, 26"',                       180, 1, NULL), -- ItemStatus.AVAILABLE
  ('22222222-2222-2222-2222-222222222222', 'Omer Espresso Machine', 'Breville Bambino, like new',           220, 1, NULL), -- ItemStatus.AVAILABLE
  ('33333333-3333-3333-3333-333333333333', 'Ido Vinyl Collection',  '40 LPs, mostly 70s rock',              140, 1, NULL)  -- ItemStatus.AVAILABLE
ON CONFLICT DO NOTHING;

-- 5. get_feed_debug RPC — same shape as get_feed + owner_display_name TEXT.
--    Production get_feed is left alone; SHOW_OWNER_DEBUG-aware code in feed.ts
--    chooses which RPC to call.
CREATE OR REPLACE FUNCTION get_feed_debug(
  current_user_id UUID,
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km INT,
  feed_limit INT,
  feed_offset INT
) RETURNS TABLE (
  id BIGINT,
  user_id UUID,
  name VARCHAR,
  description TEXT,
  points_value INT,
  status SMALLINT,
  image_url TEXT,
  created_at TIMESTAMPTZ,
  distance_km DOUBLE PRECISION,
  owner_display_name TEXT
) AS $$
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
$$ LANGUAGE sql STABLE;
