// =========================================================
// AI CivicFix — Standard Geohash Utility
// Lightweight browser-compatible geohashing for spatial indexing
// =========================================================

const B32 = "0123456789bcdefghjkmnpqrstuvwxyz";

/**
 * Encodes latitude & longitude into a standard geohash string.
 * @param {number} lat - Latitude (-90 to 90)
 * @param {number} lon - Longitude (-180 to 180)
 * @param {number} precision - Character length (default 7, ~152m box)
 * @returns {string} Geohash string
 */
export function encodeGeohash(lat, lon, precision = 7) {
  if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) return null;

  let latMin = -90.0, latMax = 90.0;
  let lonMin = -180.0, lonMax = 180.0;
  let hash = "";
  let bit = 0;
  let ch = 0;
  let isEven = true;

  while (hash.length < precision) {
    if (isEven) {
      const mid = (lonMin + lonMax) / 2;
      if (lon >= mid) {
        ch |= (1 << (4 - bit));
        lonMin = mid;
      } else {
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        ch |= (1 << (4 - bit));
        latMin = mid;
      } else {
        latMax = mid;
      }
    }

    isEven = !isEven;
    if (bit < 4) {
      bit++;
    } else {
      hash += B32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return hash;
}

/**
 * Returns the query prefix range [start, end] for a geohash prefix.
 * Useful for Firestore range queries (geohash >= start && geohash <= end).
 */
export function getGeohashRange(prefix) {
  if (!prefix) return null;
  return {
    start: prefix,
    end: prefix + "~"
  };
}

if (typeof window !== "undefined") {
  window.Geohash = {
    encode: encodeGeohash,
    range: getGeohashRange
  };
}
