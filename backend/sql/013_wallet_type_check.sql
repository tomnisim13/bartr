-- Feature 5 follow-up: enforce valid TransactionType values on wallet_transactions.
-- Mirrors backend/src/config.ts -> enum TransactionType.
--   1 = SIGNUP_BONUS
--   2 = MATCH_BONUS
--   3 = ITEM_TRADE_DEBIT
--   4 = ITEM_TRADE_CREDIT
--  99 = MANUAL_ADJUSTMENT

ALTER TABLE wallet_transactions
  ADD CONSTRAINT chk_wallet_tx_type
  CHECK (type IN (1, 2, 3, 4, 99));
