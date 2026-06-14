import { describe, it, expect } from 'vitest';
import { parsePostgisPoint } from '../validation/postgisPoint';

describe('parsePostgisPoint', () => {
  it('parses a valid POINT(lng lat)', () => {
    expect(parsePostgisPoint('POINT(34.78 32.08)')).toEqual({ lat: 32.08, lng: 34.78 });
  });

  it('parses negative coordinates', () => {
    expect(parsePostgisPoint('POINT(-122.45 37.77)')).toEqual({ lat: 37.77, lng: -122.45 });
  });

  it('returns null for non-string input', () => {
    expect(parsePostgisPoint(undefined)).toBeNull();
    expect(parsePostgisPoint(null)).toBeNull();
    expect(parsePostgisPoint(42)).toBeNull();
    expect(parsePostgisPoint({})).toBeNull();
  });

  it('returns null for malformed strings', () => {
    expect(parsePostgisPoint('not a point')).toBeNull();
    expect(parsePostgisPoint('POINT()')).toBeNull();
    expect(parsePostgisPoint('POINT(34.78)')).toBeNull();
  });

  it('returns null when coordinates are out of range', () => {
    expect(parsePostgisPoint('POINT(200 32)')).toBeNull();
    expect(parsePostgisPoint('POINT(34 91)')).toBeNull();
  });

  it('parses Supabase EWKB hex (lng=34.78, lat=32.08, SRID=4326)', () => {
    const result = parsePostgisPoint('0101000020E6100000A4703D0AD76341400AD7A3703D0A4040');
    expect(result).not.toBeNull();
    expect(result!.lng).toBeCloseTo(34.78, 4);
    expect(result!.lat).toBeCloseTo(32.08, 4);
  });

  it('returns null for hex too short to be a Point', () => {
    expect(parsePostgisPoint('0101')).toBeNull();
  });

  it('returns null for non-Point EWKB type', () => {
    expect(parsePostgisPoint('0102000020E6100000A4703D0AD76341400AD7A3703D0A4040')).toBeNull();
  });
});
