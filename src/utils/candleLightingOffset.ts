// src/utils/candleLightingOffset.ts
//
// Candle-lighting offset (minutes before sunset) for given coordinates.
//
// Matches hebcal.com (checked 2026-11-22 against its Shabbat API), plus
// Petah Tikva:
//   - Jerusalem 40, Haifa 30, Zikhron Ya'akov 30;
//   - Petah Tikva 40 (Shlomo, 2026-11-22). hebcal.com gives it 20, but OU
//     MyZmanim, Kipa and R. Ari Enkin give 40: the city was founded by
//     Jerusalemites and kept the Jerusalem custom;
//   - every other place in Israel 20 (hebcal.com's Israeli default; the
//     pinned @hebcal/core v5 still says 18);
//   - outside Israel 18.
// Safed was 40 here until 2026-11-22; hebcal.com gives it 20, so it now
// follows the Israeli default.
//
// Two ways to land on a city:
//   1. A locality picked from the list (ISRAEL_LOCALITIES): the stored
//      coordinates are that locality's own centroid, so an exact match
//      identifies it, and only Jerusalem / Haifa / Zikhron Ya'akov get their
//      offset. Neighbours inside the bounding boxes below (Motza Illit, Beit
//      Zayit, Tirat Carmel, Ma'ayan Tzvi, ...) get 20, as on hebcal.com.
//   2. Any other coordinates (GPS, the older curated city list): a bounding
//      box per city. hebcal.com itself gives raw coordinates 20 even in
//      Jerusalem; the box keeps a GPS fix in Jerusalem at 40.

import { ISRAEL_LOCALITIES } from '../constants/israelLocalities';
import { isIsraelCoords } from './isIsraelCoords';

interface CityOffset {
  name:          string;   // English city name
  nameHe:        string;   // Hebrew city name (shown in the UI hint)
  localityCode:  number;   // CBS locality code
  lat:           number;   // Bounding-box centre latitude
  lng:           number;   // Bounding-box centre longitude
  radiusDeg:     number;   // Bounding-box half-size in degrees ≈ km/111
  offsetMinutes: number;   // Minutes before sunset
}

const SPECIAL_CITIES: CityOffset[] = [
  { name: 'Jerusalem',      nameHe: 'ירושלים',    localityCode: 3000, lat: 31.7683, lng: 35.2137, radiusDeg: 0.06, offsetMinutes: 40 },
  { name: 'Haifa',          nameHe: 'חיפה',       localityCode: 4000, lat: 32.7940, lng: 34.9896, radiusDeg: 0.05, offsetMinutes: 30 },
  { name: "Zikhron Ya'akov", nameHe: 'זכרון יעקב', localityCode: 9300, lat: 32.5701, lng: 34.9519, radiusDeg: 0.02, offsetMinutes: 30 },
  // Box kept small so Ganei Tikva, Ma'as and Kiryat Ono (20) stay outside.
  { name: 'Petah Tikva',    nameHe: 'פתח תקווה',  localityCode: 7900, lat: 32.0847, lng: 34.8856, radiusDeg: 0.02, offsetMinutes: 40 },
];

export const DEFAULT_CANDLE_OFFSET_MINUTES = 18;
export const ISRAEL_CANDLE_OFFSET_MINUTES = 20;

export interface CandleLightingOffsetResult {
  /** Minutes before sunset to light candles. */
  minutes: number;
  /** English city name; present only for special-city overrides. */
  cityName?: string;
  /** Hebrew city name; present only for special-city overrides. */
  cityNameHe?: string;
}

const coordKey = (lat: number, lng: number) => `${lat.toFixed(4)},${lng.toFixed(4)}`;

let localityByCoords: Map<string, number> | null = null;
function localityCodeAt(lat: number, lng: number): number | undefined {
  if (!localityByCoords) {
    localityByCoords = new Map(ISRAEL_LOCALITIES.map((l) => [coordKey(l.lat, l.lng), l.code]));
  }
  return localityByCoords.get(coordKey(lat, lng));
}

function special(city: CityOffset): CandleLightingOffsetResult {
  return { minutes: city.offsetMinutes, cityName: city.name, cityNameHe: city.nameHe };
}

/**
 * Returns the candle-lighting offset for the given coordinates (see the
 * header for the rules). Pure function, no I/O.
 */
export function getCandleLightingOffset(
  latitude:  number,
  longitude: number,
): CandleLightingOffsetResult {
  const code = localityCodeAt(latitude, longitude);
  if (code !== undefined) {
    const city = SPECIAL_CITIES.find((c) => c.localityCode === code);
    return city ? special(city) : { minutes: ISRAEL_CANDLE_OFFSET_MINUTES };
  }

  for (const city of SPECIAL_CITIES) {
    if (Math.abs(latitude - city.lat) < city.radiusDeg && Math.abs(longitude - city.lng) < city.radiusDeg) {
      return special(city);
    }
  }
  return {
    minutes: isIsraelCoords(latitude, longitude) ? ISRAEL_CANDLE_OFFSET_MINUTES : DEFAULT_CANDLE_OFFSET_MINUTES,
  };
}
