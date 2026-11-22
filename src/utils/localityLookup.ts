// src/utils/localityLookup.ts
// Lookups over ISRAEL_LOCALITIES (CBS list of Jewish and mixed localities)
// plus OUTPOSTS (outposts and farms the CBS list lacks).

import { ISRAEL_LOCALITIES, type IsraelLocality } from '../constants/israelLocalities';
import { OUTPOSTS } from '../constants/outposts';
import { haversineKm } from './locationLookup';

/** Every pickable Israeli place: CBS localities first (they win name and coordinate ties). */
export const ALL_LOCALITIES: IsraelLocality[] = [...ISRAEL_LOCALITIES, ...OUTPOSTS];

/** A GPS fix this close to a locality's centroid is named after it. */
const NEARBY_KM = 3;

let byCode: Map<number, IsraelLocality> | null = null;

export function findLocalityByCode(code: number): IsraelLocality | undefined {
  if (!byCode) byCode = new Map(ALL_LOCALITIES.map((l) => [l.code, l]));
  return byCode.get(code);
}

/** The nearest locality within NEARBY_KM, or undefined. */
export function findNearbyLocality(lat: number, lng: number): IsraelLocality | undefined {
  let best: IsraelLocality | undefined;
  let bestKm = NEARBY_KM;
  for (const l of ALL_LOCALITIES) {
    // Cheap reject before the trig: 0.03° ≈ 3 km.
    if (Math.abs(l.lat - lat) > 0.03 || Math.abs(l.lng - lng) > 0.04) continue;
    const km = haversineKm(lat, lng, l.lat, l.lng);
    if (km < bestKm) { best = l; bestKm = km; }
  }
  return best;
}

/** Strips geresh/gershayim/quotes/hyphens and extra spaces so "קרית" ≈ "קריית" style typing still matches loosely. */
function normalize(s: string): string {
  return s.toLowerCase().replace(/["'׳״`\-–]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Hebrew or English substring search; also matches "קרית" vs "קריית". */
export function searchLocalities(query: string, limit = 60): IsraelLocality[] {
  const q = normalize(query);
  if (!q) return [];
  const qLoose = q.replace(/יי/g, 'י');
  const out: IsraelLocality[] = [];
  for (const l of ALL_LOCALITIES) {
    const he = normalize(l.he);
    if (he.includes(q) || he.replace(/יי/g, 'י').includes(qLoose) || normalize(l.en).includes(q)) {
      out.push(l);
      if (out.length >= limit) break;
    }
  }
  return out;
}
