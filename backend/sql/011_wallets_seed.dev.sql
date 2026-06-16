-- Feature 5: Wallet seed data (DEV only)
-- Creates wallets with signup bonus for all dev users

SELECT wallet_credit(
  '00000000-0000-0000-0000-000000000001'::UUID,
  starting_balance_points(),
  1::SMALLINT, -- SIGNUP_BONUS
  'Welcome bonus'
);

SELECT wallet_credit(
  '00000000-0000-0000-0000-000000000002'::UUID,
  starting_balance_points(),
  1::SMALLINT,
  'Welcome bonus'
);

SELECT wallet_credit(
  '00000000-0000-0000-0000-000000000003'::UUID,
  starting_balance_points(),
  1::SMALLINT,
  'Welcome bonus'
);

SELECT wallet_credit(
  '00000000-0000-0000-0000-000000000004'::UUID,
  starting_balance_points(),
  1::SMALLINT,
  'Welcome bonus'
);
