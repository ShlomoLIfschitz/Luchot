// src/services/ZmanimService.ts
// Adapted for kosher-zmanim@0.9.x (npm): uses ComplexZmanimCalendar + Luxon DateTime → JS Date.

import { ComplexZmanimCalendar, GeoLocation } from 'kosher-zmanim';

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

  // NEW in Phase 3.6
  candleLighting: Date | null;  // 18 min before sunset on Friday only
  havdalah: Date | null;        // tzeitHakochavim on Saturday only
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

    // Candle lighting — Friday only (JS day 5), 18 min before sunset.
    // 18 min is the Diaspora/Israel-outside-Jerusalem standard.
    // Per-city customization (Jerusalem 40 min, etc.) is Phase 4 work.
    let candleLighting: Date | null = null;
    if (date.getDay() === 5 && shkia) {
      candleLighting = new Date(shkia.getTime() - 18 * 60 * 1000);
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
    };

    zmanimCache.set(key, result);
    return result;
  } catch {
    zmanimCache.set(key, NULL_ZMANIM);
    return NULL_ZMANIM;
  }
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
