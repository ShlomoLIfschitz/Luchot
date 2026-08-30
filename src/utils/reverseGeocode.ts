// src/utils/reverseGeocode.ts
// Nominatim reverse-geocode helper — shared by NoteEditor, LocationProvider,
// and any future caller. This is the ONLY network call permitted anywhere
// in the app (offline-first, locked) — it must only ever be invoked in
// direct response to an explicit user action (GPS button tap), never
// automatically/in the background.
//
// Wave 1B hardening (security-auditor-driven):
//   - Coordinates are rounded to 3 decimal places (~110m, neighbourhood-
//     level — more than sufficient to resolve a city/place name) before
//     being sent to the third-party endpoint. Sending full-precision GPS
//     coordinates would disclose more location detail than the feature needs.
//   - 5-second AbortController timeout, `User-Agent: Luchot-App/1.0` header,
//     silent graceful fallback (never throws), and coordinates-only payload
//     (no other user data is ever sent) are all preserved.
//
// Also consolidates what used to be a second, divergent inline
// implementation in app/settings.tsx (~lines 256-282) — that copy hardened
// none of the above. A later UI wave deletes the inline copy and switches
// that call site onto reverseGeocodeCityName() below.

interface NominatimAddress {
  amenity?: string;
  shop?: string;
  tourism?: string;
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
}

/** Rounds to 3 decimal places (~110m) — see module header for rationale. */
function roundCoord(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Fetches the raw Nominatim `address` object for the given coordinates, or
 * null on any failure (timeout, non-200, network error, malformed JSON).
 * Never throws. Internal — callers should use one of the two shaped
 * exports below (reverseGeocodeNominatim / reverseGeocodeCityName).
 */
async function fetchNominatimAddress(lat: number, lng: number): Promise<NominatimAddress | null> {
  try {
    const rLat = roundCoord(lat);
    const rLng = roundCoord(lng);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    let res: Response;
    try {
      res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${rLat}&lon=${rLng}&format=json&accept-language=he`,
        { headers: { 'User-Agent': 'Luchot-App/1.0' }, signal: controller.signal },
      );
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.address ?? {}) as NominatimAddress;
  } catch {
    return null;
  }
}

/**
 * Returns a descriptive, multi-part place label (amenity/road/suburb/city),
 * comma-joined, e.g. "בית קפה, רחוב הרצל, לב העיר, תל אביב". Used by
 * NoteEditor for tagging a note's location. Returns '' on any failure —
 * silent graceful fallback, never throws.
 */
export async function reverseGeocodeNominatim(lat: number, lng: number): Promise<string> {
  const a = await fetchNominatimAddress(lat, lng);
  if (!a) return '';
  const parts = [
    a.amenity ?? a.shop ?? a.tourism,
    a.road,
    a.suburb ?? a.neighbourhood,
    a.city ?? a.town ?? a.village ?? a.county,
  ].filter(Boolean);
  return parts.join(', ');
}

/**
 * Returns just the city/town/village-level name (no street/amenity detail),
 * e.g. "תל אביב". Used by LocationProvider.acquireFromDeviceGps to resolve
 * a display name for a GPS fix that falls outside the 36 curated cities,
 * and by the candle-lighting location flow in settings.tsx. Returns '' on
 * any failure — silent graceful fallback, never throws.
 */
export async function reverseGeocodeCityName(lat: number, lng: number): Promise<string> {
  const a = await fetchNominatimAddress(lat, lng);
  if (!a) return '';
  return a.city ?? a.town ?? a.village ?? a.county ?? '';
}
