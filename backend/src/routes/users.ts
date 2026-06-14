import { Router } from 'express';
import { supabase } from '../supabase';
import { logger } from '../logger';
import { DEMO_USER_ID } from '../constants';
import { parseLatLng } from '../validation/location';

export const usersRouter = Router();

usersRouter.post('/v1/users/location', async (req, res) => {
  const userId = DEMO_USER_ID;
  const parsed = parseLatLng(req.body);

  if (!parsed) {
    logger.warn({ body: req.body }, 'Location rejected: invalid input');
    res.status(400).json({ error: 'Invalid request. Required: latitude (-90..90), longitude (-180..180)' });
    return;
  }

  try {
    const { error } = await supabase
      .from('user_locations')
      .upsert({
        user_id: userId,
        location: `POINT(${parsed.lng} ${parsed.lat})`,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      logger.error({ error, userId }, 'Location upsert failed');
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    logger.info({ userId, lat: parsed.lat, lng: parsed.lng }, 'Location updated');
    res.json({ success: true });
  } catch (err) {
    logger.error({ err, userId }, 'Location unexpected error');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
