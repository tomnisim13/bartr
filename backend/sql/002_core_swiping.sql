-- Feature 2: Core Swiping Flow
-- Run this in Supabase SQL Editor

-- Drop existing items table and recreate with full schema
DROP TABLE IF EXISTS interactions;
DROP TABLE IF EXISTS items;

CREATE TABLE items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    points_value INT NOT NULL,
    status SMALLINT NOT NULL DEFAULT 1,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_items_feed_filtering ON items (status, user_id);

CREATE TABLE interactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL,
    item_id BIGINT REFERENCES items(id) ON DELETE CASCADE NOT NULL,
    type SMALLINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, now()) NOT NULL
);

CREATE UNIQUE INDEX idx_interactions_user_item ON interactions (user_id, item_id);

-- RLS policies
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on items" ON items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on interactions" ON interactions FOR ALL USING (true) WITH CHECK (true);

-- Feed function (used by GET /v1/feed)
CREATE OR REPLACE FUNCTION get_feed(current_user_id UUID, feed_limit INT, feed_offset INT)
RETURNS SETOF items
LANGUAGE sql
STABLE
AS $$
  SELECT i.* FROM items i
  WHERE i.status = 1
    AND i.user_id != current_user_id
    AND NOT EXISTS (
      SELECT 1 FROM interactions int
      WHERE int.item_id = i.id AND int.user_id = current_user_id
    )
  ORDER BY i.created_at DESC
  LIMIT feed_limit OFFSET feed_offset;
$$;

-- Seed data: demo items from different users
INSERT INTO items (user_id, name, description, points_value, status, image_url) VALUES
  ('00000000-0000-0000-0000-000000000002', 'Classic Fender Guitar', 'Great condition, comes with a padded gig bag and brand new D''Addario strings.', 150, 1, 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400'),
  ('00000000-0000-0000-0000-000000000002', 'MacBook Pro 2021', '14-inch M1 Pro, 16GB RAM, 512GB SSD. Minor scratch on bottom.', 200, 1, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400'),
  ('00000000-0000-0000-0000-000000000003', 'Vintage Leather Jacket', 'Authentic 1970s brown leather. Size M. Broken in beautifully.', 80, 1, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400'),
  ('00000000-0000-0000-0000-000000000003', 'Sony WH-1000XM5', 'Noise cancelling headphones. Like new, barely used. Includes case.', 100, 1, 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400'),
  ('00000000-0000-0000-0000-000000000004', 'Mountain Bike - Trek', 'Trek Marlin 7, size large. New tires, recently serviced.', 180, 1, 'https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=400'),
  ('00000000-0000-0000-0000-000000000004', 'Nintendo Switch OLED', 'White model with 3 games. Perfect condition, barely played.', 120, 1, 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=400'),
  ('00000000-0000-0000-0000-000000000005', 'Canon EOS R6', 'Full-frame mirrorless camera body only. 15k shutter count.', 250, 1, 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400'),
  ('00000000-0000-0000-0000-000000000005', 'Standing Desk - Uplift', 'Electric sit-stand desk, 60x30 bamboo top. Includes cable tray.', 130, 1, 'https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=400');
