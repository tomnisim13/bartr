-- =============================================================================
-- bartr — consolidated production schema
-- Run this on a fresh Supabase project's SQL editor.
-- Sources (canonical fixes already applied):
--   002_core_swiping.sql        items, interactions, get_feed v1 (replaced)
--   004_geolocation.sql         postgis, user_locations, get_feed v2 (geo)
--   005_matches.sql             matches, record_interaction v1 (replaced)
--   007_record_interaction_v2   available-item gate + extra OUT cols
--   009_record_interaction_fix  variable_conflict use_column directive
--   010_wallets.sql             wallets, wallet_transactions, RPCs (replaced)
--   012_users_table.sql         users + on-insert trigger
--   013_wallet_type_check.sql   inlined as CHECK on wallet_transactions.type
--   014_wallet_credit_zero_init wallet_credit / wallet_debit fixed forms
-- =============================================================================


-- ----- Extensions -----------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS postgis;


-- ----- Tables ---------------------------------------------------------------
CREATE TABLE items (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       UUID NOT NULL,
  name          VARCHAR(50) NOT NULL,
  description   TEXT,
  points_value  INT NOT NULL,
  status        SMALLINT NOT NULL DEFAULT 1,  -- ItemStatus.AVAILABLE
  image_url     TEXT,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE interactions (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID NOT NULL,
  item_id     BIGINT REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  type        SMALLINT NOT NULL,             -- InteractionType
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE user_locations (
  user_id     UUID PRIMARY KEY,
  location    GEOGRAPHY(Point, 4326) NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE matches (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_one_id   UUID NOT NULL,
  user_two_id   UUID NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT matches_canonical_pair CHECK (user_one_id < user_two_id),
  CONSTRAINT matches_unique_pair    UNIQUE (user_one_id, user_two_id)
);

CREATE TABLE wallets (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         UUID UNIQUE NOT NULL,
  balance_points  INT NOT NULL DEFAULT 0 CHECK (balance_points >= 0),
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- type values mirror backend/src/config.ts -> enum TransactionType:
--   1 SIGNUP_BONUS, 2 MATCH_BONUS, 3 ITEM_TRADE_DEBIT, 4 ITEM_TRADE_CREDIT, 99 MANUAL_ADJUSTMENT
CREATE TABLE wallet_transactions (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  wallet_id       BIGINT NOT NULL REFERENCES wallets(id),
  type            SMALLINT NOT NULL,
  amount          INT NOT NULL,
  balance_after   INT NOT NULL,
  reference_id    TEXT,
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT chk_wallet_tx_type CHECK (type IN (1, 2, 3, 4, 99))
);

CREATE TABLE users (
  id            UUID PRIMARY KEY,
  display_name  VARCHAR(100) NOT NULL DEFAULT 'Anonymous',
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);


-- ----- Row-Level Security ---------------------------------------------------
-- WARNING: blanket "allow all" policies. Tighten before exposing the API
-- behind real auth. Tracked separately from this schema migration.
ALTER TABLE items                ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_locations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches              ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow all" ON items                FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON interactions         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON user_locations       FOR ALL USING (true);
CREATE POLICY "allow all" ON matches              FOR ALL USING (true);
CREATE POLICY "allow all" ON wallets              FOR ALL USING (true);
CREATE POLICY "allow all" ON wallet_transactions  FOR ALL USING (true);
CREATE POLICY "allow all" ON users                FOR ALL USING (true);


-- ----- Indexes --------------------------------------------------------------
CREATE INDEX idx_items_feed_filtering        ON items (status, user_id);
CREATE UNIQUE INDEX idx_interactions_user_item ON interactions (user_id, item_id);
CREATE INDEX idx_user_locations_geo          ON user_locations USING GIST (location);
CREATE INDEX idx_matches_user_search         ON matches (user_one_id, user_two_id);
CREATE INDEX idx_wallet_transactions_wallet  ON wallet_transactions (wallet_id);


-- ----- Functions ------------------------------------------------------------
-- Constant-style helper used by callers (route, trigger, seed).
CREATE OR REPLACE FUNCTION starting_balance_points() RETURNS INT
LANGUAGE sql IMMUTABLE
AS 'SELECT 100;';


-- Atomic credit. Wallet rows are created at balance 0; the caller is solely
-- responsible for the granted amount (signup bonus, match bonus, etc).
CREATE OR REPLACE FUNCTION wallet_credit(
  p_user_id      UUID,
  p_amount       INT,
  p_type         SMALLINT,
  p_description  TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
) RETURNS TABLE (wallet_id BIGINT, new_balance INT, transaction_id BIGINT)
LANGUAGE plpgsql AS $func$
DECLARE
  v_wallet_id   BIGINT;
  v_new_balance INT;
  v_tx_id       BIGINT;
BEGIN
  INSERT INTO wallets (user_id, balance_points)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE wallets w
  SET balance_points = balance_points + p_amount, updated_at = now()
  WHERE w.user_id = p_user_id
  RETURNING w.id, w.balance_points INTO v_wallet_id, v_new_balance;

  INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, reference_id, description)
  VALUES (v_wallet_id, p_type, p_amount, v_new_balance, p_reference_id, p_description)
  RETURNING id INTO v_tx_id;

  RETURN QUERY SELECT v_wallet_id, v_new_balance, v_tx_id;
END;
$func$;


-- Atomic debit. Raises P0001 'Insufficient balance' on overdraft attempts.
CREATE OR REPLACE FUNCTION wallet_debit(
  p_user_id      UUID,
  p_amount       INT,
  p_type         SMALLINT,
  p_description  TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
) RETURNS TABLE (wallet_id BIGINT, new_balance INT, transaction_id BIGINT)
LANGUAGE plpgsql AS $func$
DECLARE
  v_wallet_id   BIGINT;
  v_new_balance INT;
  v_tx_id       BIGINT;
BEGIN
  INSERT INTO wallets (user_id, balance_points)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE wallets w
  SET balance_points = balance_points - p_amount, updated_at = now()
  WHERE w.user_id = p_user_id AND balance_points >= p_amount
  RETURNING w.id, w.balance_points INTO v_wallet_id, v_new_balance;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Insufficient balance' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, reference_id, description)
  VALUES (v_wallet_id, p_type, -p_amount, v_new_balance, p_reference_id, p_description)
  RETURNING id INTO v_tx_id;

  RETURN QUERY SELECT v_wallet_id, v_new_balance, v_tx_id;
END;
$func$;


-- AFTER INSERT trigger function on users — auto-grants signup bonus.
CREATE OR REPLACE FUNCTION on_user_created() RETURNS TRIGGER
LANGUAGE plpgsql AS $func$
BEGIN
  PERFORM wallet_credit(
    NEW.id,
    starting_balance_points(),
    1::SMALLINT,                  -- TransactionType.SIGNUP_BONUS
    'Welcome bonus'
  );
  RETURN NEW;
END;
$func$;


-- Geo-aware feed (production). SRID 4326 mirrors SRID_WGS84 in config.ts.
CREATE OR REPLACE FUNCTION get_feed(
  current_user_id UUID,
  user_lat        DOUBLE PRECISION,
  user_lng        DOUBLE PRECISION,
  radius_km       INT,
  feed_limit      INT,
  feed_offset     INT
) RETURNS TABLE (
  id           BIGINT,
  user_id      UUID,
  name         VARCHAR,
  description  TEXT,
  points_value INT,
  status       SMALLINT,
  image_url    TEXT,
  created_at   TIMESTAMPTZ,
  distance_km  DOUBLE PRECISION
) LANGUAGE sql STABLE AS $func$
  SELECT
    i.id, i.user_id, i.name, i.description, i.points_value, i.status,
    i.image_url, i.created_at,
    ST_Distance(ul.location, ST_MakePoint(user_lng, user_lat)::geography) / 1000.0 AS distance_km
  FROM items i
  JOIN user_locations ul ON ul.user_id = i.user_id
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


-- Atomic interaction insert + mutual-like check + match insert.
-- #variable_conflict use_column resolves OUT-param vs. matches-column ambiguity.
CREATE OR REPLACE FUNCTION record_interaction(
  swiper_id        UUID,
  p_item_id        BIGINT,
  interaction_type SMALLINT
) RETURNS TABLE (
  success      BOOLEAN,
  is_match     BOOLEAN,
  match_id     BIGINT,
  user_one_id  UUID,
  user_two_id  UUID
) LANGUAGE plpgsql AS $func$
#variable_conflict use_column
DECLARE
  v_item_owner  UUID;
  v_item_status SMALLINT;
  v_is_match    BOOLEAN := FALSE;
  v_match_id    BIGINT  := NULL;
  v_user_one    UUID    := NULL;
  v_user_two    UUID    := NULL;
BEGIN
  BEGIN
    INSERT INTO interactions (user_id, item_id, type)
    VALUES (swiper_id, p_item_id, interaction_type);
  EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT FALSE, FALSE, NULL::BIGINT, NULL::UUID, NULL::UUID;
    RETURN;
  END;

  -- Match check fires only for LIKE (InteractionType.LIKE = 1)
  IF interaction_type = 1 THEN
    SELECT user_id, status INTO v_item_owner, v_item_status
    FROM items WHERE id = p_item_id;

    -- Available gate: target item must currently be AVAILABLE (ItemStatus.AVAILABLE = 1)
    IF v_item_owner IS NOT NULL AND v_item_status = 1 THEN
      IF EXISTS (
        SELECT 1
        FROM interactions i
        JOIN items it ON it.id = i.item_id
        WHERE i.user_id = v_item_owner
          AND i.type = 1                 -- InteractionType.LIKE
          AND it.user_id = swiper_id
          AND it.status = 1              -- ItemStatus.AVAILABLE
      ) THEN
        v_user_one := LEAST(swiper_id, v_item_owner);
        v_user_two := GREATEST(swiper_id, v_item_owner);

        INSERT INTO matches (user_one_id, user_two_id)
        VALUES (v_user_one, v_user_two)
        ON CONFLICT (user_one_id, user_two_id) DO NOTHING
        RETURNING matches.id INTO v_match_id;

        IF v_match_id IS NOT NULL THEN
          v_is_match := TRUE;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN QUERY SELECT TRUE, v_is_match, v_match_id, v_user_one, v_user_two;
  RETURN;
END;
$func$;


-- ----- Triggers -------------------------------------------------------------
CREATE TRIGGER trg_user_created
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION on_user_created();
