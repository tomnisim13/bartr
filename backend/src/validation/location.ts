export function parseLatLng(input: { latitude?: any; longitude?: any }): { lat: number; lng: number } | null {
  const lat = Number(input.latitude);
  const lng = Number(input.longitude);

  if (!isFinite(lat) || !isFinite(lng)) return null;
  if (lat < -90 || lat > 90) return null;
  if (lng < -180 || lng > 180) return null;

  return { lat, lng };
}
