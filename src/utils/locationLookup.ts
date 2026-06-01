// src/utils/locationLookup.ts
//
// Phase 4.5 — Coordinate ↔ city utilities.
//
// Must be imported AFTER `import '@hebcal/cities'` has fired (which
// registers the 700-city database into @hebcal/core's Location class).
// The side-effect import lives in LocationProvider.tsx.
//
// lookupCityByCoords: returns the first curated city within
//   PROXIMITY_RADIUS_KM of the given coords, or null.
//
// findNearestCity: ALWAYS returns a city (the closest by haversine).
//   Used as fallback when GPS coords are far from every curated city.
//
// getCityCoordinates: returns the actual lat/lng from Hebcal for a
//   given key — used when the user picks a city from the picker.

import { Location } from '@hebcal/core';
import { CITIES, type CityEntry, findCityByKey } from '../constants/cities';

/** Maximum distance in km to consider "user is in this city". */
const PROXIMITY_RADIUS_KM = 15;

// Re-export findCityByKey so callers can import both from one file.
export { findCityByKey };

/**
 * Returns the first CityEntry within PROXIMITY_RADIUS_KM of the
 * given coordinates, or null if none qualifies.
 */
export function lookupCityByCoords(
  lat: number,
  lng: number,
): CityEntry | null {
  for (const city of CITIES) {
    const loc = Location.lookup(city.hebcalKey);
    if (!loc) continue;
    if (haversineKm(lat, lng, loc.getLatitude(), loc.getLongitude()) < PROXIMITY_RADIUS_KM) {
      return city;
    }
  }
  return null;
}

/**
 * Returns the city closest to the given coordinates by haversine
 * distance. Never returns null — the curated list is non-empty.
 */
export function findNearestCity(
  lat: number,
  lng: number,
): { city: CityEntry; distanceKm: number } {
  let bestCity = CITIES[0];
  let bestDist = Infinity;

  for (const city of CITIES) {
    const loc = Location.lookup(city.hebcalKey);
    if (!loc) continue;
    const dist = haversineKm(lat, lng, loc.getLatitude(), loc.getLongitude());
    if (dist < bestDist) {
      bestDist = dist;
      bestCity = city;
    }
  }

  return { city: bestCity, distanceKm: bestDist };
}

/**
 * Returns the hebcalKey of the nearest city within thresholdDeg degrees
 * (squared Euclidean lat/lng — sufficient for city-level resolution).
 * Returns null if no city is within threshold.
 * Distinct from findNearestCity which always returns a city + haversine distance.
 */
export function findNearestCityKey(
  lat: number,
  lng: number,
  thresholdDeg = 2.0,
): string | null {
  let bestKey: string | null = null;
  let bestDist = Infinity;
  for (const city of CITIES) {
    const coords = getCityCoordinates(city.hebcalKey);
    if (!coords) continue;
    const dist = (coords.lat - lat) ** 2 + (coords.lng - lng) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      bestKey = city.hebcalKey;
    }
  }
  return bestDist <= thresholdDeg ** 2 ? bestKey : null;
}

/**
 * Returns the lat/lng from Hebcal for the given city key.
 * Useful when the user picks a city from the list and we need
 * to update LocationProvider with actual coordinates.
 * Returns null if the key is not in @hebcal/core's registry.
 */
export function getCityCoordinates(
  hebcalKey: string,
): { lat: number; lng: number } | null {
  const loc = Location.lookup(hebcalKey);
  if (!loc) return null;
  return { lat: loc.getLatitude(), lng: loc.getLongitude() };
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371; // Earth radius km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
