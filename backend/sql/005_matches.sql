-- Feature 4: Match Engine
-- Canonical pair: user_one_id < user_two_id prevents duplicate match rows.

CREATE TABLE matches (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_one_id UUID NOT NULL,
  user_two_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  CONSTRAINT matches_canonical_pair CHECK (user_one_id < user_two_id),
  CONSTRAINT matches_unique_pair UNIQUE (user_one_id, user_two_id)
);

CREATE INDEX idx_matches_user_search ON matches (user_one_id, user_two_id);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON matches FOR ALL USING (true);

-- record_interaction: atomic insert-interaction + mutual-like check + insert-match.
-- Returns success=false on duplicate interaction (23505).
CREATE OR REPLACE FUNCTION record_interaction(
  swiper_id UUID,
  p_item_id BIGINT,
  interaction_type SMALLINT
) RETURNS TABLE (success BOOLEAN, is_match BOOLEAN, match_id BIGINT) AS $$
DECLARE
  v_item_owner UUID;
  v_is_match BOOLEAN := FALSE;
  v_match_id BIGINT := NULL;
BEGIN
  -- Insert the interaction (may raise 23505 on duplicate)
  BEGIN
    INSERT INTO interactions (user_id, item_id, type)
    VALUES (swiper_id, p_item_id, interaction_type);
  EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT FALSE, FALSE, NULL::BIGINT;
    RETURN;
  END;

  -- Only check for match on LIKE (type = 1)
  IF interaction_type = 1 THEN
    -- Get the item's owner
    SELECT user_id INTO v_item_owner FROM items WHERE id = p_item_id;

    IF v_item_owner IS NOT NULL THEN
      -- Check if the item owner has liked any item belonging to the swiper
      IF EXISTS (
        SELECT 1
        FROM interactions i
        JOIN items it ON it.id = i.item_id
        WHERE i.user_id = v_item_owner
          AND i.type = 1
          AND it.user_id = swiper_id
      ) THEN
        -- Mutual like detected — insert match with canonical ordering
        INSERT INTO matches (user_one_id, user_two_id)
        VALUES (LEAST(swiper_id, v_item_owner), GREATEST(swiper_id, v_item_owner))
        ON CONFLICT (user_one_id, user_two_id) DO NOTHING
        RETURNING matches.id INTO v_match_id;

        IF v_match_id IS NOT NULL THEN
          v_is_match := TRUE;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN QUERY SELECT TRUE, v_is_match, v_match_id;
  RETURN;
END;
$$ LANGUAGE plpgsql;
