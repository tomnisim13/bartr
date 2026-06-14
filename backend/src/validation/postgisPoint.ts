interface ParsedPoint {
  lat: number;
  lng: number;
}

const WKT_POINT = /POINT\(([-\d.]+) ([-\d.]+)\)/;
const HEX_RE = /^[0-9a-fA-F]+$/;
const POINT_TYPE = 1;
const EWKB_SRID_FLAG = 0x20000000;
const MIN_EWKB_LEN_BYTES = 21; // 1 byte order + 4 type + 8 X + 8 Y

function isValidLatLng(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

function parseWkt(text: string): ParsedPoint | null {
  const match = text.match(WKT_POINT);
  if (!match) return null;
  const lng = parseFloat(match[1]);
  const lat = parseFloat(match[2]);
  return isValidLatLng(lat, lng) ? { lat, lng } : null;
}

function parseEwkbHex(text: string): ParsedPoint | null {
  if (!HEX_RE.test(text) || text.length % 2 !== 0) return null;

  const buf = Buffer.from(text, 'hex');
  if (buf.length < MIN_EWKB_LEN_BYTES) return null;

  const byteOrder = buf.readUInt8(0);
  if (byteOrder !== 1) return null; // only little-endian supported

  const typeWithFlags = buf.readUInt32LE(1);
  const baseType = typeWithFlags & 0xff;
  const hasSRID = (typeWithFlags & EWKB_SRID_FLAG) !== 0;
  if (baseType !== POINT_TYPE) return null;

  const coordOffset = hasSRID ? 9 : 5;
  if (buf.length < coordOffset + 16) return null;

  const lng = buf.readDoubleLE(coordOffset);
  const lat = buf.readDoubleLE(coordOffset + 8);
  return isValidLatLng(lat, lng) ? { lat, lng } : null;
}

export function parsePostgisPoint(text: unknown): ParsedPoint | null {
  if (typeof text !== 'string' || text.length === 0) return null;
  return parseWkt(text) ?? parseEwkbHex(text);
}
