// src/hooks/useShabbatTable.ts
//
// Returns the Shabbat times table for the 4 fixed Israeli cities plus,
// when the user has an active location (GPS or manual city pick), a fifth
// user-location row at the end.
//
// `date` must be the FRIDAY of the desired Shabbat.
//
// USER ROW GATING:
//   source === 'default'  → no user row (avoids a duplicate Jerusalem entry
//                           since the default coords ARE Jerusalem).
//   source === 'gps' | 'manual' → user row appended with a Hebrew label
//                           resolved from cityHebcalKey (falls back to
//                           'המיקום שלי' when the key is absent/unknown).
//
// Candle-lighting offset: per-city minhag (Jerusalem 40 min, Haifa 30 min,
// Safed 40 min, everywhere else 18 min) — applied inside getShabbatTable →
// getCandleAndHavdalah → getZmanim. SettingsProvider / candleLightingLeadMinutes
// is intentionally NOT read here (locked per-city-minhag decision).
//
// Havdalah: Geonim 8.5° tzeit (getTzaisGeonim8Point5Degrees), sourced from
// ZmanimResult.tzeitHakochavim via getZmanim on the Saturday date.

import { useMemo } from 'react';
import { getShabbatTable, ShabbatRow } from '../services/ZmanimService';
import { useLocationStore } from '../providers/LocationProvider';
import { findCityByKey } from '../constants/cities';

export function useShabbatTable(date: Date): ShabbatRow[] {
  const latitude      = useLocationStore((s) => s.latitude);
  const longitude     = useLocationStore((s) => s.longitude);
  const source        = useLocationStore((s) => s.source);
  const cityHebcalKey = useLocationStore((s) => s.cityHebcalKey);

  return useMemo(() => {
    // Only pass user coords when the user has actively set a location.
    // 'default' means the store was never touched — coords are Jerusalem,
    // which is already in the fixed-cities table.
    if (source === 'default') {
      return getShabbatTable(date);
    }

    // Resolve a Hebrew label from the known city list; fall back gracefully.
    const userLabel =
      cityHebcalKey != null
        ? (findCityByKey(cityHebcalKey)?.nameHe ?? 'המיקום שלי')
        : 'המיקום שלי';

    return getShabbatTable(date, latitude, longitude, userLabel);
  }, [date, latitude, longitude, source, cityHebcalKey]);
}
