-- Feature 5 follow-up: fix double-credit bug in wallet_credit / wallet_debit.
--
-- Previously the "ensure wallet exists" INSERT seeded balance with
-- starting_balance_points() (100). The subsequent UPDATE then added p_amount
-- on top, so a brand-new wallet credited with the signup bonus ended at 200.
--
-- New invariant: wallet rows are created at balance 0. Any starting bonus
-- must be granted explicitly by the caller via wallet_credit(p_amount, ...).
-- The starting_balance_points() helper now serves only as the canonical
-- amount that callers (trigger, seed, /v1/wallet) pass for SIGNUP_BONUS.

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
$$ LANGUAGE plpgsql;

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
$$ LANGUAGE plpgsql;
