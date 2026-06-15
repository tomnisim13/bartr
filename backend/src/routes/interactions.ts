import { Router } from 'express';
import { supabase } from '../supabase';
import { InteractionType } from '../config';
import { logger } from '../logger';
import { POSTGRES_UNIQUE_VIOLATION } from '../constants';

export const interactionsRouter = Router();

const VALID_INTERACTION_TYPES: InteractionType[] = [
  InteractionType.DISLIKE,
  InteractionType.LIKE,
];

function isValidInteractionPayload(item_id: unknown, type: unknown): boolean {
  return item_id != null && VALID_INTERACTION_TYPES.includes(type as InteractionType);
}

interactionsRouter.post('/v1/interactions', async (req, res) => {
  const { item_id, type } = req.body;
  const userId = req.currentUserId;

  if (!isValidInteractionPayload(item_id, type)) {
    logger.warn({ item_id, type }, 'Interaction rejected: invalid input');
    res.status(400).json({ error: 'Invalid request. Required: item_id (number), type (0 or 1)' });
    return;
  }

  try {
    const { data, error } = await supabase.rpc('record_interaction', {
      swiper_id: userId,
      p_item_id: item_id,
      interaction_type: type,
    });

    if (error) {
      if (error.code === POSTGRES_UNIQUE_VIOLATION) {
        logger.warn({ userId, item_id }, 'Duplicate interaction attempted');
        res.status(409).json({ error: 'Interaction already exists' });
        return;
      }
      logger.error({ error, userId, item_id }, 'Interaction RPC failed');
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (!result?.success) {
      logger.warn({ userId, item_id }, 'Duplicate interaction attempted');
      res.status(409).json({ error: 'Interaction already exists' });
      return;
    }

    if (result.is_match) {
      logger.info({ userId, item_id, type, match_id: result.match_id }, 'Match created');
    } else {
      logger.info({ userId, item_id, type }, 'Interaction recorded');
    }

    res.status(201).json({
      success: true,
      is_match: result.is_match,
      match_id: result.match_id ?? undefined,
    });
  } catch (err) {
    logger.error({ err, userId, item_id }, 'Interaction unexpected error');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
