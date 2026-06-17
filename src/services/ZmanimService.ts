// src/services/ZmanimService.ts
// Adapted for kosher-zmanim@0.9.x (npm): uses ComplexZmanimCalendar + Luxon DateTime → JS Date.

import { ComplexZmanimCalendar, GeoLocation } from 'kosher-zmanim';
import { getCandleLightingOffset } from '../utils/candleLightingOffset';

export type ZmanimMethod = 'GRA' | 'MGA';

export interface ZmanimResult {
  alotHashachar: Date | null;
  misheyakir: Date | null;
  netz: Date | null;
  sofZmanShmaMGA: Date | null;
  sofZmanShmaGRA: Date | null;
  sofZmanTfillaMGA: Date | null;
  sofZmanTfillaGRA: Date | null;
  chatzot: Date | null;
  minchaGedola: Date | null;
  minchaKetana: Date | null;
  plagHamincha: Date | null;
  shkia: Date | null;
  tzeitHakochavim: Date | null;
  tzeitRabbeinu: Date | null;

  // Phase 3.6
  candleLighting: Date | null;  // N min before sunset on Friday only
  havdalah: Date | null;        // tzeitHakochavim on Saturday only

  // Phase 4.3 — per-city minhag metadata (set only when isFriday)
  candleLightingOffsetMinutes?: number; // e.g. 40 for Jerusalem, 18 elsewhere
  candleLightingCityNameHe?: string;    // e.g. "ירושלים"; absent for default 18-min
}

const zmanimCache = new Map<string, ZmanimResult>();

const NULL_ZMANIM: ZmanimResult = {
  alotHashachar: null,
  misheyakir: null,
  netz: null,
  sofZmanShmaMGA: null,
  sofZmanShmaGRA: null,
  sofZmanTfillaMGA: null,
  sofZmanTfillaGRA: null,
  chatzot: null,
  minchaGedola: null,
  minchaKetana: null,
  plagHamincha: null,
  shkia: null,
  tzeitHakochavim: null,
  tzeitRabbeinu: null,
  candleLighting: null,
  havdalah: null,
};

/** kosher-zmanim returns Luxon DateTime; avoid importing luxon types (no @types/luxon needed). */
function toJsDate(dt: { isValid: boolean; toJSDate: () => Date } | null | undefined): Date | null {
  if (!dt || !dt.isValid) return null;
  return dt.toJSDate();
}

export function getZmanim(
  date: Date,
  latitude: number,
  longitude: number,
  elevation = 0,
  method: ZmanimMethod = 'GRA'
): ZmanimResult {
  const key = `${date.toDateString()}-${latitude.toFixed(4)}-${longitude.toFixed(4)}-${method}`;
  if (zmanimCache.has(key)) return zmanimCache.get(key)!;

  try {
    const geoLocation = new GeoLocation('', latitude, longitude, elevation, 'Asia/Jerusalem');
    const czc = new ComplexZmanimCalendar(geoLocation);
    czc.setDate(date);

    const plag =
      method === 'MGA'
        ? czc.getPlagHamincha(czc.getAlos72(), czc.getTzais72())
        : czc.getPlagHamincha(czc.getSunrise(), czc.getSunset());

    // Extract as locals so candle/havdalah computation can reference them
    const shkia           = toJsDate(czc.getSunset());
    const tzeitHakochavim = toJsDate(czc.getTzaisGeonim8Point5Degrees());

    // Candle lighting — Friday only (JS day 5).
    // Offset is city-specific (Jerusalem 40 min, Haifa 30 min, Safed 40 min,
    // everywhere else 18 min). getCandleLightingOffset is a pure function —
    // safe to call on every invocation; cost is negligible.
    const isFriday = date.getDay() === 5;
    const clOffsetResult = getCandleLightingOffset(latitude, longitude);
    const clOffset = clOffsetResult.minutes;

    let candleLighting: Date | null = null;
    let candleLightingOffsetMinutes: number | undefined;
    let candleLightingCityNameHe: string | undefined;
    if (isFriday && shkia) {
      candleLighting = new Date(shkia.getTime() - clOffset * 60 * 1000);
      candleLightingOffsetMinutes = clOffset;
      candleLightingCityNameHe = clOffsetResult.cityNameHe;
    }

    // Havdalah — Saturday only (JS day 6), equals tzeitHakochavim.
    let havdalah: Date | null = null;
    if (date.getDay() === 6 && tzeitHakochavim) {
      havdalah = tzeitHakochavim;
    }

    const result: ZmanimResult = {
      alotHashachar: toJsDate(czc.getAlos72()),
      misheyakir: toJsDate(czc.getMisheyakir10Point2Degrees()),
      netz: toJsDate(czc.getSunrise()),
      sofZmanShmaMGA: toJsDate(czc.getSofZmanShmaMGA()),
      sofZmanShmaGRA: toJsDate(czc.getSofZmanShmaGRA()),
      sofZmanTfillaMGA: toJsDate(czc.getSofZmanTfilaMGA()),
      sofZmanTfillaGRA: toJsDate(czc.getSofZmanTfilaGRA()),
      chatzot: toJsDate(czc.getChatzos()),
      minchaGedola: toJsDate(czc.getMinchaGedola(czc.getSunrise(), czc.getSunset())),
      minchaKetana: toJsDate(czc.getMinchaKetana(czc.getSunrise(), czc.getSunset())),
      plagHamincha: toJsDate(plag),
      shkia,
      tzeitHakochavim,
      tzeitRabbeinu: toJsDate(czc.getTzais72()),
      candleLighting,
      havdalah,
      candleLightingOffsetMinutes,
      candleLightingCityNameHe,
    };

    zmanimCache.set(key, result);
    return result;
  } catch {
    zmanimCache.set(key, NULL_ZMANIM);
    return NULL_ZMANIM;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shabbat table helpers
// ─────────────────────────────────────────────────────────────────────────────

export interface ShabbatTimes {
  candleLighting: Date | null; // Friday candle lighting (per-city offset)
  havdalah: Date | null;       // Saturday-night tzeit (Geonim 8.5°)
}

export interface ShabbatRow {
  nameHe: string;
  candleLighting: Date | null;
  havdalah: Date | null;
  isUserRow?: boolean;
}

export const FIXED_CITIES = [
  { nameHe: 'ירושלים', lat: 31.7683, lng: 35.2137, il: true },
  { nameHe: 'תל אביב', lat: 32.0853, lng: 34.7818, il: true },
  { nameHe: 'חיפה',    lat: 32.7940, lng: 34.9896, il: true },
  { nameHe: 'באר שבע', lat: 31.2518, lng: 34.7913, il: true },
] as const;

/**
 * Given a FRIDAY date and coords, returns candle-lighting (that Friday,
 * per-city minhag offset) and havdalah (the following Saturday night,
 * Geonim 8.5° tzeit). Reuses `getZmanim` — no new kosher-zmanim instances.
 */
export function getCandleAndHavdalah(date: Date, lat: number, lng: number): ShabbatTimes {
  const friday = getZmanim(date, lat, lng);
  const sat = new Date(date);
  sat.setDate(sat.getDate() + 1); // Saturday
  const saturday = getZmanim(sat, lat, lng);
  return {
    candleLighting: friday.candleLighting,  // Friday-only, per-city offset (already correct)
    havdalah: saturday.tzeitHakochavim,     // Saturday-night Geonim 8.5° tzeit
  };
}

/**
 * Returns a Shabbat times table for the 4 fixed Israeli cities, optionally
 * followed by a user-location row. `date` must be the FRIDAY of the Shabbat.
 *
 * User row is included only when `userLat` and `userLng` are both provided.
 * When `userLabel` is omitted, the row is labelled 'המיקום שלי'.
 */
export function getShabbatTable(
  date: Date,
  userLat?: number,
  userLng?: number,
  userLabel?: string,
): ShabbatRow[] {
  const rows: ShabbatRow[] = FIXED_CITIES.map((c) => {
    const t = getCandleAndHavdalah(date, c.lat, c.lng);
    return { nameHe: c.nameHe, candleLighting: t.candleLighting, havdalah: t.havdalah };
  });
  if (userLat != null && userLng != null) {
    const t = getCandleAndHavdalah(date, userLat, userLng);
    rows.push({
      nameHe: userLabel ?? 'המיקום שלי',
      candleLighting: t.candleLighting,
      havdalah: t.havdalah,
      isUserRow: true,
    });
  }
  return rows;
}

export function isAfterSunset(zmanim: ZmanimResult): boolean {
  if (!zmanim.shkia) return false;
  return new Date() > zmanim.shkia;
}

export function formatZmanTime(date: Date | null, use24h = false): string {
  if (!date) return '—';
  return date.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !use24h,
  });
}
