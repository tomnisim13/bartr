-- Feature 5: Digital Wallet
-- Run this in Supabase SQL Editor (production migration)

CREATE TABLE wallets (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL,
  balance_points INT NOT NULL DEFAULT 0 CHECK (balance_points >= 0),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON wallets FOR ALL USING (true);

CREATE TABLE wallet_transactions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  wallet_id BIGINT NOT NULL REFERENCES wallets(id),
  type SMALLINT NOT NULL,
  amount INT NOT NULL,
  balance_after INT NOT NULL,
  reference_id TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_wallet_transactions_wallet ON wallet_transactions(wallet_id);
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON wallet_transactions FOR ALL USING (true);

-- Starting balance for new wallets
CREATE OR REPLACE FUNCTION starting_balance_points() RETURNS INT AS $$
  SELECT 100;
$$ LANGUAGE sql IMMUTABLE;

-- Atomic credit: creates wallet if needed, adds points, logs transaction
CREATE OR REPLACE FUNCTION wallet_credit(
  p_user_id UUID,
  p_amount INT,
  p_type SMALLINT,
  p_description TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
) RETURNS TABLE (wallet_id BIGINT, new_balance INT, transaction_id BIGINT) AS $$
DECLARE
  v_wallet_id BIGINT;
  v_new_balance INT;
  v_tx_id BIGINT;
BEGIN
  -- Get or create wallet
  INSERT INTO wallets (user_id, balance_points)
  VALUES (p_user_id, starting_balance_points())
  ON CONFLICT (user_id) DO NOTHING;

  -- Atomic update
  UPDATE wallets w
  SET balance_points = balance_points + p_amount, updated_at = now()
  WHERE w.user_id = p_user_id
  RETURNING w.id, w.balance_points INTO v_wallet_id, v_new_balance;

  -- Log transaction
  INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, reference_id, description)
  VALUES (v_wallet_id, p_type, p_amount, v_new_balance, p_reference_id, p_description)
  RETURNING id INTO v_tx_id;

  RETURN QUERY SELECT v_wallet_id, v_new_balance, v_tx_id;
END;
$$ LANGUAGE plpgsql;

-- Atomic debit: fails if insufficient balance
CREATE OR REPLACE FUNCTION wallet_debit(
  p_user_id UUID,
  p_amount INT,
  p_type SMALLINT,
  p_description TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
) RETURNS TABLE (wallet_id BIGINT, new_balance INT, transaction_id BIGINT) AS $$
DECLARE
  v_wallet_id BIGINT;
  v_new_balance INT;
  v_tx_id BIGINT;
BEGIN
  -- Get or create wallet
  INSERT INTO wallets (user_id, balance_points)
  VALUES (p_user_id, starting_balance_points())
  ON CONFLICT (user_id) DO NOTHING;

  -- Atomic update with balance check
  UPDATE wallets w
  SET balance_points = balance_points - p_amount, updated_at = now()
  WHERE w.user_id = p_user_id AND balance_points >= p_amount
  RETURNING w.id, w.balance_points INTO v_wallet_id, v_new_balance;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Insufficient balance' USING ERRCODE = 'P0001';
  END IF;

  -- Log transaction
  INSERT INTO wallet_transactions (wallet_id, type, amount, balance_after, reference_id, description)
  VALUES (v_wallet_id, p_type, -p_amount, v_new_balance, p_reference_id, p_description)
  RETURNING id INTO v_tx_id;

  RETURN QUERY SELECT v_wallet_id, v_new_balance, v_tx_id;
END;
$$ LANGUAGE plpgsql;
