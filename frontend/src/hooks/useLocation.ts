import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { postLocation, getLastLocation } from '../api';
import { config } from '../config';
import { logger } from '../logger';

export type LocationStatus = 'pending' | 'granted' | 'fallback' | 'denied';

interface Coords {
  lat: number;
  lng: number;
}

// Tel Aviv — used in dev when the simulator/device GPS is unreliable.
const DEV_FALLBACK_COORDS: Coords = { lat: 32.08, lng: 34.78 };

interface UseLocationResult {
  status: LocationStatus;
  coords: Coords | null;
}

async function isPermissionGranted(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

async function fetchInitialCoords(): Promise<Coords | null> {
  try {
    const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 3000));
    const position = await Promise.race([
      Location.getCurrentPositionAsync({}),
      timeout,
    ]);
    if (!position) {
      logger.warn({}, 'getCurrentPositionAsync timed out');
      return null;
    }
    return { lat: position.coords.latitude, lng: position.coords.longitude };
  } catch (err) {
    logger.warn({ err: String(err) }, 'getCurrentPositionAsync failed');
    return null;
  }
}

async function fetchLastStoredCoords(): Promise<Coords | null> {
  const last = await getLastLocation();
  if (!last) return null;
  return { lat: last.latitude, lng: last.longitude };
}

async function postCoordsSafely(coords: Coords, msg: string): Promise<void> {
  try {
    await postLocation(coords.lat, coords.lng);
    logger.info({ lat: coords.lat, lng: coords.lng }, msg);
  } catch (err) {
    logger.error({ err: String(err), lat: coords.lat, lng: coords.lng }, `${msg}: post failed`);
  }
}

export function useLocation(): UseLocationResult {
  const [status, setStatus] = useState<LocationStatus>('pending');
  const [coords, setCoords] = useState<Coords | null>(null);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    bootstrap();

    return () => {
      mountedRef.current = false;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
    // bootstrap captures only refs and module-scope helpers — safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === 'granted' || status === 'pending') return;

    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return;
      const { status: permStatus } = await Location.getForegroundPermissionsAsync();
      if (permStatus === 'granted' && mountedRef.current) {
        logger.info({}, 'Permission granted on app focus — re-bootstrapping location');
        await bootstrap();
      }
    });

    return () => sub.remove();
  }, [status]);

  async function bootstrap(): Promise<void> {
    const granted = await isPermissionGranted();
    if (!mountedRef.current) return;

    if (!granted) {
      const fallback = (await fetchLastStoredCoords()) ?? (__DEV__ ? DEV_FALLBACK_COORDS : null);
      if (!mountedRef.current) return;
      if (fallback) {
        logger.info({ lat: fallback.lat, lng: fallback.lng }, 'Using fallback location');
        setCoords(fallback);
        setStatus('fallback');
      } else {
        logger.warn({}, 'Location permission denied and no fallback available');
        setStatus('denied');
      }
      return;
    }

    const initial = __DEV__ ? DEV_FALLBACK_COORDS : ((await fetchInitialCoords()) ?? (await fetchLastStoredCoords()));
    if (!mountedRef.current) return;

    if (!initial) {
      logger.error({}, 'Permission granted but no coords obtainable');
      setStatus('denied');
      return;
    }

    setCoords(initial);
    setStatus('granted');
    await postCoordsSafely(initial, 'Initial location posted');
    if (!__DEV__) await subscribeToMovement();
  }

  async function subscribeToMovement(): Promise<void> {
    subscriptionRef.current?.remove();
    subscriptionRef.current = await Location.watchPositionAsync(
      { distanceInterval: config.location.SIGNIFICANT_DISTANCE_CHANGE_METERS },
      async (loc) => {
        const updated = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        if (!mountedRef.current) return;
        setCoords(updated);
        await postCoordsSafely(updated, 'Location updated (movement)');
      }
    );
  }

  return { status, coords };
}
