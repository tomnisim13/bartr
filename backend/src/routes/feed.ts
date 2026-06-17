import { Router, Request } from 'express';
import { supabase } from '../supabase';
import { config } from '../config';
import { logger } from '../logger';
import { parseLatLng } from '../validation/location';
import { timed } from '../utils/timed';

export const feedRouter = Router();

function parseFeedQuery(req: Request) {
  const coords = parseLatLng({ latitude: req.query.latitude, longitude: req.query.longitude });
  const limit = Number(req.query.limit) || config.feed.limit;
  const offset = Number(req.query.offset) || 0;
  const radiusRaw = Number(req.query.radius_km) || config.location.DEFAULT_RADIUS_KM;
  const radius_km = Math.max(0, Math.min(radiusRaw, config.location.MAX_RADIUS_KM));
  return { coords, limit, offset, radius_km };
}

feedRouter.get('/v1/feed', async (req, res) => {
  const userId = req.currentUserId;
  const { coords, limit, offset, radius_km } = parseFeedQuery(req);

  if (!coords) {
    logger.warn({ query: req.query }, 'Feed rejected: missing coords');
    res.status(400).json({ error: 'Invalid request. Required: latitude, longitude query params' });
    return;
  }

  const rpcParams = {
    current_user_id: userId,
    user_lat: coords.lat,
    user_lng: coords.lng,
    radius_km,
    feed_limit: limit,
    feed_offset: offset,
  };

  try {
    const { data, error } = await runFeedQuery(rpcParams);

    if (error) {
      logger.error({ error, userId, limit, offset }, 'Feed RPC failed');
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    logger.info(
      { userId, count: (data || []).length, offset, radius_km, lat: coords.lat, lng: coords.lng },
      'Feed served'
    );
    res.json(data || []);
  } catch (err) {
    logger.error({ err, userId }, 'Feed unexpected error');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Dispatches between get_feed (prod) and get_feed_debug (dev with SHOW_OWNER_DEBUG on).
// Falls back gracefully if the debug RPC isn't deployed (e.g. migration 008 not applied).
async function runFeedQuery(params: Record<string, unknown>) {
  if (!config.debug.SHOW_OWNER_DEBUG) {
    return timed('rpc.get_feed', { userId: params.current_user_id }, () => supabase.rpc('get_feed', params));
  }
  const debugResult = await timed('rpc.get_feed_debug', { userId: params.current_user_id }, () =>
    supabase.rpc('get_feed_debug', params),
  );
  if (debugResult.error) {
    logger.warn({ error: debugResult.error }, 'get_feed_debug unavailable, falling back to get_feed');
    return timed('rpc.get_feed', { userId: params.current_user_id }, () => supabase.rpc('get_feed', params));
  }
  return debugResult;
}
