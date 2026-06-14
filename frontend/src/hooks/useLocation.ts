import { useEffect, useState, useRef } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { postLocation, getLastLocation } from '../api';
import { config } from '../config';
import { logger } from '../logger';

export type LocationStatus = 'pending' | 'granted' | 'denied';

interface Coords {
  lat: number;
  lng: number;
}

interface UseLocationResult {
  status: LocationStatus;
  coords: Coords | null;
}

export function useLocation(): UseLocationResult {
  const [status, setStatus] = useState<LocationStatus>('pending');
  const [coords, setCoords] = useState<Coords | null>(null);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let mounted = true;

    async function requestAndWatch() {
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();

      if (!mounted) return;

      if (permStatus !== 'granted') {
        // Try fallback to last stored location
        const last = await getLastLocation();
        if (last && mounted) {
          setCoords({ lat: last.latitude, lng: last.longitude });
          setStatus('granted');
          logger.info({ lat: last.latitude, lng: last.longitude }, 'Using last stored location (permission denied)');
          return;
        }
        setStatus('denied');
        return;
      }

      setStatus('granted');

      let initial: { lat: number; lng: number };
      try {
        const position = await Location.getCurrentPositionAsync({});
        initial = { lat: position.coords.latitude, lng: position.coords.longitude };
      } catch {
        // GPS unavailable — fall back to last stored location
        const last = await getLastLocation();
        if (last && mounted) {
          setCoords({ lat: last.latitude, lng: last.longitude });
          logger.info({ lat: last.latitude, lng: last.longitude }, 'Using last stored location (GPS unavailable)');
          return;
        }
        if (mounted) setStatus('denied');
        return;
      }

      if (!mounted) return;
      setCoords(initial);

      try {
        await postLocation(initial.lat, initial.lng);
        logger.info({ lat: initial.lat, lng: initial.lng }, 'Initial location posted');
      } catch (err) {
        logger.error({ err: String(err) }, 'Failed to post initial location');
      }

      subscriptionRef.current = await Location.watchPositionAsync(
        { distanceInterval: config.location.SIGNIFICANT_DISTANCE_CHANGE_METERS },
        async (loc) => {
          const updated = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          if (mounted) setCoords(updated);
          try {
            await postLocation(updated.lat, updated.lng);
            logger.info({ lat: updated.lat, lng: updated.lng }, 'Location updated (movement)');
          } catch (err) {
            logger.error({ err: String(err) }, 'Failed to post updated location');
          }
        }
      );
    }

    requestAndWatch();

    return () => {
      mounted = false;
      subscriptionRef.current?.remove();
    };
  }, []);

  // Re-check permission when app returns to foreground (user may have enabled in Settings)
  useEffect(() => {
    if (status !== 'denied') return;

    const subscription = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        const { status: permStatus } = await Location.getForegroundPermissionsAsync();
        if (permStatus === 'granted') {
          setStatus('pending');
          // Will re-trigger the main effect via status change... but simpler to just reload
          // For now, force a re-mount by setting pending then the effect won't re-run.
          // The user needs to restart or we need a more complex approach.
          // Simple: just set granted and get position
          setStatus('granted');
          const position = await Location.getCurrentPositionAsync({});
          setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
          await postLocation(position.coords.latitude, position.coords.longitude);
        }
      }
    });

    return () => subscription.remove();
  }, [status]);

  return { status, coords };
}
