import { Router } from 'express';
import { supabase } from '../supabase';
import { InteractionType } from '../config';
import { logger } from '../logger';
import { DEMO_USER_ID, POSTGRES_UNIQUE_VIOLATION } from '../constants';

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
  const userId = DEMO_USER_ID;

  if (!isValidInteractionPayload(item_id, type)) {
    logger.warn({ item_id, type }, 'Interaction rejected: invalid input');
    res.status(400).json({ error: 'Invalid request. Required: item_id (number), type (0 or 1)' });
    return;
  }

  try {
    const { error } = await supabase
      .from('interactions')
      .insert({ user_id: userId, item_id, type });

    if (error) {
      if (error.code === POSTGRES_UNIQUE_VIOLATION) {
        logger.warn({ userId, item_id }, 'Duplicate interaction attempted');
        res.status(409).json({ error: 'Interaction already exists' });
        return;
      }
      logger.error({ error, userId, item_id }, 'Interaction insert failed');
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    logger.info({ userId, item_id, type }, 'Interaction recorded');
    res.status(201).json({ success: true });
  } catch (err) {
    logger.error({ err, userId, item_id }, 'Interaction unexpected error');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
