-- Core users table — single source of truth for identity until auth lands

CREATE TABLE users (
  id UUID PRIMARY KEY,
  display_name VARCHAR(100) NOT NULL DEFAULT 'Anonymous',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON users FOR ALL USING (true);

-- Auto-create wallet with signup bonus on user insert
CREATE OR REPLACE FUNCTION on_user_created() RETURNS TRIGGER AS $$
BEGIN
  PERFORM wallet_credit(
    NEW.id,
    starting_balance_points(),
    1::SMALLINT, -- SIGNUP_BONUS
    'Welcome bonus'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_created
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION on_user_created();

-- Seed all existing users
INSERT INTO users (id, display_name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Demo User'),
  ('00000000-0000-0000-0000-000000000002', 'Seed User 2'),
  ('00000000-0000-0000-0000-000000000003', 'Seed User 3'),
  ('00000000-0000-0000-0000-000000000004', 'Seed User 4'),
  ('11111111-1111-1111-1111-111111111111', 'Tom'),
  ('22222222-2222-2222-2222-222222222222', 'Omer'),
  ('33333333-3333-3333-3333-333333333333', 'Ido'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Yossi'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Dani')
ON CONFLICT (id) DO NOTHING;
