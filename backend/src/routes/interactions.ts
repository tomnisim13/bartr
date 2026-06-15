import { Router } from 'express';
import { supabase } from '../supabase';
import { InteractionType } from '../config';
import { logger } from '../logger';

export const interactionsRouter = Router();

const VALID_INTERACTION_TYPES: InteractionType[] = [
  InteractionType.DISLIKE,
  InteractionType.LIKE,
];

interface RecordInteractionResult {
  success: boolean;
  is_match: boolean;
  match_id: number | null;
  user_one_id: string | null;
  user_two_id: string | null;
}

function isValidInteractionPayload(item_id: unknown, type: unknown): boolean {
  return item_id != null && VALID_INTERACTION_TYPES.includes(type as InteractionType);
}

function normalizeRpcResult(data: unknown): RecordInteractionResult | null {
  if (Array.isArray(data)) return (data[0] as RecordInteractionResult) ?? null;
  if (data && typeof data === 'object') return data as RecordInteractionResult;
  return null;
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
      logger.error({ error, userId, item_id }, 'Interaction RPC failed');
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    const result = normalizeRpcResult(data);
    if (!result) {
      logger.error({ data, userId, item_id }, 'Interaction RPC returned unexpected shape');
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    if (!result.success) {
      logger.warn({ userId, item_id }, 'Duplicate interaction rejected (RPC unique_violation)');
      res.status(409).json({ error: 'Interaction already exists' });
      return;
    }

    if (result.is_match) {
      logger.info(
        {
          match_id: result.match_id,
          user_one: result.user_one_id,
          user_two: result.user_two_id,
          swiper: userId,
          item_id,
          type,
        },
        'Match successfully created'
      );
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
