-- Feature 3: Geo-Location Filtering
-- Requires PostGIS extension. Apply via Supabase SQL Editor.
-- SRID 4326 == SRID_WGS84 in backend/src/config.ts and frontend/src/config.ts.

CREATE EXTENSION IF NOT EXISTS postgis;

-- User location table. SRID 4326 (WGS84) — see SRID_WGS84 constant in config.ts.
CREATE TABLE user_locations (
  user_id UUID PRIMARY KEY,
  location GEOGRAPHY(Point, 4326) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX idx_user_locations_geo ON user_locations USING GIST (location);

ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON user_locations FOR ALL USING (true);

-- Replace the old get_feed function with geo-aware version
DROP FUNCTION IF EXISTS get_feed(UUID, INT, INT);

CREATE FUNCTION get_feed(
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
  distance_km DOUBLE PRECISION
) AS $$
  SELECT
    i.id, i.user_id, i.name, i.description, i.points_value, i.status,
    i.image_url, i.created_at,
    ST_Distance(ul.location, ST_MakePoint(user_lng, user_lat)::geography) / 1000.0 AS distance_km
  FROM items i
  JOIN user_locations ul ON ul.user_id = i.user_id
  WHERE i.status = 1            -- ItemStatus.AVAILABLE (kept in sync with config.ts)
    AND i.user_id != current_user_id
    AND NOT EXISTS (
      SELECT 1 FROM interactions x
      WHERE x.user_id = current_user_id AND x.item_id = i.id
    )
    AND ST_DWithin(ul.location, ST_MakePoint(user_lng, user_lat)::geography, radius_km * 1000)
  ORDER BY distance_km ASC
  LIMIT feed_limit OFFSET feed_offset;
$$ LANGUAGE sql STABLE;
