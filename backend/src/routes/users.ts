import { Router } from 'express';
import { supabase } from '../supabase';
import { logger } from '../logger';
import { DEMO_USER_ID } from '../constants';
import { parseLatLng } from '../validation/location';

export const usersRouter = Router();

usersRouter.get('/v1/users/location', async (req, res) => {
  const userId = DEMO_USER_ID;

  try {
    const { data, error } = await supabase
      .from('user_locations')
      .select('location, updated_at')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'No stored location' });
      return;
    }

    // Parse POINT(lng lat) from PostGIS
    const match = data.location?.match?.(/POINT\(([-\d.]+) ([-\d.]+)\)/);
    if (!match) {
      res.status(404).json({ error: 'No stored location' });
      return;
    }

    res.json({ latitude: parseFloat(match[2]), longitude: parseFloat(match[1]), updated_at: data.updated_at });
  } catch (err) {
    logger.error({ err, userId }, 'Get location unexpected error');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

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
