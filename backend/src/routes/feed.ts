import { Router, Request } from 'express';
import { supabase } from '../supabase';
import { config } from '../config';
import { logger } from '../logger';
import { DEMO_USER_ID } from '../constants';
import { parseLatLng } from '../validation/location';

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
  const userId = DEMO_USER_ID;
  const { coords, limit, offset, radius_km } = parseFeedQuery(req);

  if (!coords) {
    logger.warn({ query: req.query }, 'Feed rejected: missing coords');
    res.status(400).json({ error: 'Invalid request. Required: latitude, longitude query params' });
    return;
  }

  try {
    const { data, error } = await supabase.rpc('get_feed', {
      current_user_id: userId,
      user_lat: coords.lat,
      user_lng: coords.lng,
      radius_km,
      feed_limit: limit,
      feed_offset: offset,
    });

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
