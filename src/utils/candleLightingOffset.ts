// src/utils/candleLightingOffset.ts
//
// Phase 4.3 — Determines candle-lighting offset (minutes before sunset)
// based on geographic coordinates.
//
// Cities with non-default offsets (Israeli minhag):
//   - Jerusalem: 40 minutes
//   - Haifa: 30 minutes
//   - Safed (Tzfat): 40 minutes
//
// All other locations default to 18 minutes (standard minhag).
//
// Detection uses a simple bounding-box per city rather than haversine
// distance. For the city-vs-default decision at Israeli scale, a
// degree-based proximity check is accurate enough and zero-dependency.
// Radii are sized to capture each city proper without spilling into
// adjacent settlements (which often follow their own minhag, deferred
// to Phase 5+ when a broader city list is added).

interface CityOffset {
  name:          string;   // English name (for logging / future use)
  nameHe:        string;   // Hebrew name (shown in UI hint)
  lat:           number;   // Centre latitude
  lng:           number;   // Centre longitude
  radiusDeg:     number;   // Detection radius in degrees ≈ km/111
  offsetMinutes: number;   // Minutes before sunset
}

const SPECIAL_CITIES: CityOffset[] = [
  {
    name:          'Jerusalem',
    nameHe:        'ירושלים',
    lat:           31.7683,
    lng:           35.2137,
    radiusDeg:     0.06,   // ~7 km — covers the city proper
    offsetMinutes: 40,
  },
  {
    name:          'Haifa',
    nameHe:        'חיפה',
    lat:           32.7940,
    lng:           34.9896,
    radiusDeg:     0.05,   // ~6 km
    offsetMinutes: 30,
  },
  {
    name:          'Safed',
    nameHe:        'צפת',
    lat:           32.9650,
    lng:           35.4951,
    radiusDeg:     0.04,   // ~4 km
    offsetMinutes: 40,
  },
];

export const DEFAULT_CANDLE_OFFSET_MINUTES = 18;

export interface CandleLightingOffsetResult {
  /** Minutes before sunset to light candles. */
  minutes: number;
  /** English city name; present only for special-city overrides. */
  cityName?: string;
  /** Hebrew city name; present only for special-city overrides. */
  cityNameHe?: string;
}

/**
 * Returns the appropriate candle-lighting offset (minutes before sunset)
 * for the given coordinates. If the location is within a special-city
 * radius, returns that city's minhag offset and name. Otherwise returns
 * the default 18-minute offset with no city name.
 *
 * Pure function — no I/O, no async. Safe to call on every zmanim
 * calculation without performance concern.
 */
export function getCandleLightingOffset(
  latitude:  number,
  longitude: number,
): CandleLightingOffsetResult {
  for (const city of SPECIAL_CITIES) {
    const latDiff = Math.abs(latitude  - city.lat);
    const lngDiff = Math.abs(longitude - city.lng);
    if (latDiff < city.radiusDeg && lngDiff < city.radiusDeg) {
      return {
        minutes:    city.offsetMinutes,
        cityName:   city.name,
        cityNameHe: city.nameHe,
      };
    }
  }
  return { minutes: DEFAULT_CANDLE_OFFSET_MINUTES };
}
