-- Feature 4 Review Fixes:
--   1. Available-item gate: only count likes on items still in AVAILABLE status.
--   2. Return user_one_id + user_two_id so the API can audit both parties.
--   3. Back-reference numeric enum literals (InteractionType.LIKE, ItemStatus.AVAILABLE).
--
-- Function signature changed (added two columns), so we DROP first.

DROP FUNCTION IF EXISTS record_interaction(UUID, BIGINT, SMALLINT);

CREATE OR REPLACE FUNCTION record_interaction(
  swiper_id UUID,
  p_item_id BIGINT,
  interaction_type SMALLINT
) RETURNS TABLE (
  success BOOLEAN,
  is_match BOOLEAN,
  match_id BIGINT,
  user_one_id UUID,
  user_two_id UUID
) AS $$
DECLARE
  v_item_owner UUID;
  v_item_status SMALLINT;
  v_is_match BOOLEAN := FALSE;
  v_match_id BIGINT := NULL;
  v_user_one UUID := NULL;
  v_user_two UUID := NULL;
BEGIN
  -- Insert interaction (may raise 23505 on duplicate)
  BEGIN
    INSERT INTO interactions (user_id, item_id, type)
    VALUES (swiper_id, p_item_id, interaction_type);
  EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT FALSE, FALSE, NULL::BIGINT, NULL::UUID, NULL::UUID;
    RETURN;
  END;

  -- Match check fires only for LIKE (InteractionType.LIKE = 1)
  IF interaction_type = 1 THEN
    -- Resolve item owner + status; bail if item is missing or not available
    SELECT user_id, status INTO v_item_owner, v_item_status
    FROM items WHERE id = p_item_id;

    -- Available gate: target item must currently be AVAILABLE (ItemStatus.AVAILABLE = 1)
    IF v_item_owner IS NOT NULL AND v_item_status = 1 THEN
      -- Mutual-like check: owner must have liked an AVAILABLE item belonging to swiper
      IF EXISTS (
        SELECT 1
        FROM interactions i
        JOIN items it ON it.id = i.item_id
        WHERE i.user_id = v_item_owner
          AND i.type = 1          -- InteractionType.LIKE
          AND it.user_id = swiper_id
          AND it.status = 1       -- ItemStatus.AVAILABLE
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
$$ LANGUAGE plpgsql;
