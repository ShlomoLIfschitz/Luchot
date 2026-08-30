// src/providers/LocationProvider.tsx
// Phase 4.5 — Extended with city name, location source, and persistence.
// Wave 1B — LocationProvider is now the SINGLE source of truth for "where
// the user is". It absorbs what used to be a second, independent location
// system living in SettingsProvider (candleLightingCity/Lat/Lng/PlaceName),
// which drove ONLY candle-lighting notifications. See loadFromStorage()
// below for the one-time migration that adopts an existing candle-lighting
// location into this store on upgrade.
//
// State:
//   latitude, longitude   — passed to ZmanimService (unchanged contract)
//   cityHebcalKey?        — which curated city we're at (if known)
//   placeName?            — human-readable display name. Curated city's
//                           Hebrew name when matched, else a Nominatim-
//                           resolved name (GPS only), else undefined.
//   source                — 'gps' | 'manual' | 'default'
//
// Actions:
//   setLocationFromGps(lat, lng)   — raw GPS fix (no name resolution beyond
//                                    a curated-city match); persists.
//   setLocationFromCity(hebcalKey) — manual pick; pulls coords from Hebcal; persists
//   acquireFromDeviceGps()         — Wave 1B: the robust, shared GPS
//                                    acquisition flow (services-enabled
//                                    check, permission-state distinction,
//                                    hard timeout, Nominatim fallback name
//                                    resolution). Prefer this over
//                                    setLocationFromGps for anything
//                                    user-facing — see report for callers
//                                    that must be updated to use it.
//   loadFromStorage()              — called once at startup; rehydrates persisted
//                                    state and runs the candle-lighting migration.
//
// Old setLocation(lat, lng) is intentionally removed. Callers that still
// use it (only settings.tsx GPS button, which is now replaced by the
// picker) no longer exist after Phase 4.5.
//
// Persistence uses the generic preferences table via StorageService.
// Keys: location_lat, location_lng, location_city, location_source,
// location_place_name.
// Migration for existing users (lat/lng saved but no city key):
//   lookupCityByCoords is called on startup to attempt backfill.

import '@hebcal/cities'; // side-effect: registers ~700 cities into Location
import { create } from 'zustand';
import * as Location from 'expo-location';
import type { LocationObject } from 'expo-location';
import { DEFAULT_LAT, DEFAULT_LNG } from '../constants/config';
import { StorageService } from '../services/StorageService';
import { findCityByKey } from '../constants/cities';
import {
  lookupCityByCoords,
  findNearestCity,
  getCityCoordinates,
} from '../utils/locationLookup';
import { reverseGeocodeCityName } from '../utils/reverseGeocode';

export type LocationSource = 'gps' | 'manual' | 'default';

/**
 * Result of acquireFromDeviceGps() — a discriminated union so the UI can
 * render a precise indicator (spinner / success / a specific error reason)
 * instead of a single generic failure state. Never throws — always
 * resolves to one of these.
 */
export type GpsResult =
  | { ok: true; placeName?: string; cityHebcalKey?: string; lat: number; lng: number }
  | {
      ok: false;
      reason:
        | 'servicesDisabled'   // OS-level location services are off
        | 'permissionDenied'   // user denied, can still ask again
        | 'permissionBlocked'  // user denied permanently — must open system settings
        | 'timeout'            // getCurrentPositionAsync took too long
        | 'error';             // anything else (defensive catch-all)
    };

/** Hard timeout for getCurrentPositionAsync — Expo's own timeout options
 *  are unreliable across versions/platforms, so we implement it ourselves
 *  via Promise.race. Long enough for a cold GPS fix, short enough that the
 *  UI never appears to hang. */
const GPS_TIMEOUT_MS = 12_000;

interface LocationState {
  latitude: number;
  longitude: number;
  cityHebcalKey?: string;      // @hebcal/core city key — undefined means "unknown"
  placeName?: string;          // human-readable display name (curated city or Nominatim)
  source: LocationSource;       // how we got these coords

  setLocationFromGps:   (lat: number, lng: number) => void;
  setLocationFromCity:  (hebcalKey: string) => boolean;  // false if key unknown
  acquireFromDeviceGps: () => Promise<GpsResult>;
  loadFromStorage:      () => Promise<void>;
}

/** Persists the full location tuple in one batch of fire-and-forget writes. */
function persistLocation(
  lat: number,
  lng: number,
  cityKey: string | undefined,
  source: LocationSource,
  placeName: string | undefined,
): void {
  StorageService.setPref('location_lat',        String(lat));
  StorageService.setPref('location_lng',        String(lng));
  StorageService.setPref('location_city',       cityKey ?? '');
  StorageService.setPref('location_source',     source);
  StorageService.setPref('location_place_name', placeName ?? '');
}

const DEFAULT_CITY = findCityByKey('Jerusalem');

export const useLocationStore = create<LocationState>((set) => ({
  latitude:      DEFAULT_LAT,
  longitude:     DEFAULT_LNG,
  cityHebcalKey: 'Jerusalem', // default city matches DEFAULT_LAT/LNG (Jerusalem)
  placeName:     DEFAULT_CITY?.nameHe ?? 'ירושלים',
  source:        'default',

  // ── GPS fix (raw setter — no network, no timeout handling) ─────────────
  setLocationFromGps: (lat, lng) => {
    const matched = lookupCityByCoords(lat, lng);
    const cityKey = matched?.hebcalKey;
    const placeName = matched?.nameHe;

    set({ latitude: lat, longitude: lng, cityHebcalKey: cityKey, placeName, source: 'gps' });
    persistLocation(lat, lng, cityKey, 'gps', placeName);
  },

  // ── Manual city pick ─────────────────────────────────────────────────────
  setLocationFromCity: (hebcalKey) => {
    const city = findCityByKey(hebcalKey);
    if (!city) return false;

    const coords = getCityCoordinates(hebcalKey);
    if (!coords) return false;

    set({
      latitude:      coords.lat,
      longitude:     coords.lng,
      cityHebcalKey: hebcalKey,
      placeName:     city.nameHe,
      source:        'manual',
    });
    persistLocation(coords.lat, coords.lng, hebcalKey, 'manual', city.nameHe);

    return true;
  },

  // ── Robust device-GPS acquisition (Wave 1B, Task 2) ─────────────────────
  acquireFromDeviceGps: async () => {
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) return { ok: false, reason: 'servicesDisabled' };

      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        return {
          ok: false,
          reason: perm.canAskAgain === false ? 'permissionBlocked' : 'permissionDenied',
        };
      }

      // Zmanim need city-level precision, not metre-level — Balanced is
      // appropriate and faster/cheaper than High accuracy.
      const positionPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const timeoutPromise = new Promise<'timeout'>((resolve) => {
        setTimeout(() => resolve('timeout'), GPS_TIMEOUT_MS);
      });
      const raced: LocationObject | 'timeout' = await Promise.race([
        positionPromise,
        timeoutPromise,
      ]);
      if (raced === 'timeout') return { ok: false, reason: 'timeout' };

      const lat = raced.coords.latitude;
      const lng = raced.coords.longitude;

      const matched = lookupCityByCoords(lat, lng);
      const cityHebcalKey = matched?.hebcalKey;
      let placeName = matched?.nameHe;

      if (!placeName) {
        // No curated city nearby — fall back to the one permitted network
        // call in the app (user-triggered, direct response to this GPS
        // request). Silent graceful fallback: a failed/empty resolution
        // still leaves the GPS fix itself valid — zmanim work fine from
        // raw coordinates with no display name.
        const resolved = await reverseGeocodeCityName(lat, lng);
        if (resolved) placeName = resolved;
      }

      set({ latitude: lat, longitude: lng, cityHebcalKey, placeName, source: 'gps' });
      persistLocation(lat, lng, cityHebcalKey, 'gps', placeName);

      return { ok: true, lat, lng, cityHebcalKey, placeName };
    } catch {
      return { ok: false, reason: 'error' };
    }
  },

  // ── Startup rehydration ──────────────────────────────────────────────────
  loadFromStorage: async () => {
    // Single batched read (one transaction) — see StorageService.getAllPrefs.
    const p = await StorageService.getAllPrefs();
    const latStr       = p.location_lat        ?? '';
    const lngStr        = p.location_lng        ?? '';
    const cityKey       = p.location_city       ?? '';
    const sourceStr      = p.location_source     ?? 'default';
    const placeNameStr  = p.location_place_name ?? '';

    const hasOwnLocation = Boolean(latStr && lngStr);

    // ── Migration: adopt an orphaned candle-lighting-only location ────────
    // Pre-unification installs may have a candle-lighting-specific location
    // persisted separately (candleLightingLat/Lng/City/PlaceName, written by
    // the old settings.tsx GPS/city flow) that this store never knew about.
    // If this store has no location of its own yet (or is still sitting at
    // the untouched 'default' — belt-and-suspenders, shouldn't normally
    // co-occur with hasOwnLocation), adopt the candle-lighting location so
    // the user doesn't silently lose their configured city and start
    // getting candle-lighting reminders (and zmanim!) for the Jerusalem
    // default instead. Idempotent: once adopted, the orphaned keys are
    // cleared below, so this branch is a no-op on every subsequent launch.
    // Guarded (`canAdopt`) so it can never clobber a location the user
    // deliberately set in THIS store (source 'gps' or 'manual').
    const canAdopt = !hasOwnLocation || sourceStr === 'default';
    if (canAdopt) {
      const clLatStr      = p.candleLightingLat       ?? '';
      const clLngStr      = p.candleLightingLng       ?? '';
      const clCity        = p.candleLightingCity      ?? '';
      const clPlaceName   = p.candleLightingPlaceName ?? '';

      if (clLatStr && clLngStr) {
        // GPS-based candle-lighting location — adopt as 'gps'.
        const lat = parseFloat(clLatStr);
        const lng = parseFloat(clLngStr);
        if (!isNaN(lat) && !isNaN(lng)) {
          const matched = lookupCityByCoords(lat, lng);
          const cityHebcalKey = matched?.hebcalKey;
          const placeName = clPlaceName || matched?.nameHe;

          set({ latitude: lat, longitude: lng, cityHebcalKey, placeName, source: 'gps' });
          persistLocation(lat, lng, cityHebcalKey, 'gps', placeName);

          // Clear the now-orphaned candle-lighting keys.
          StorageService.setPref('candleLightingLat', '');
          StorageService.setPref('candleLightingLng', '');
          StorageService.setPref('candleLightingCity', '');
          StorageService.setPref('candleLightingPlaceName', '');
          return; // migration complete — normal rehydration below is skipped this launch
        }
      } else if (clCity) {
        // City-key-based candle-lighting location — adopt as 'manual'.
        const coords = getCityCoordinates(clCity);
        const cityEntry = findCityByKey(clCity);
        if (coords && cityEntry) {
          set({
            latitude: coords.lat,
            longitude: coords.lng,
            cityHebcalKey: clCity,
            placeName: cityEntry.nameHe,
            source: 'manual',
          });
          persistLocation(coords.lat, coords.lng, clCity, 'manual', cityEntry.nameHe);

          StorageService.setPref('candleLightingCity', '');
          StorageService.setPref('candleLightingPlaceName', ''); // defensive — shouldn't be set alongside a city key, but clear it too
          return;
        }
      }
    }

    // No persisted data of our own, and nothing to migrate → keep Jerusalem default.
    if (!hasOwnLocation) return;

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (isNaN(lat) || isNaN(lng)) return;

    const source = (sourceStr === 'gps' || sourceStr === 'manual')
      ? (sourceStr as LocationSource)
      : 'default';

    // Migration: existing users may have lat/lng but no cityKey.
    // Run lookupCityByCoords to backfill; if still not found, use nearest.
    let resolvedKey: string | undefined = cityKey || undefined;
    if (!resolvedKey) {
      const matched = lookupCityByCoords(lat, lng);
      if (matched) {
        resolvedKey = matched.hebcalKey;
      } else {
        const { city } = findNearestCity(lat, lng);
        resolvedKey = city.hebcalKey;
      }
      // Write the backfilled key back to storage so next startup is instant
      StorageService.setPref('location_city', resolvedKey ?? '');
    }

    // Migration: existing users (pre-Wave-1B) have no location_place_name at
    // all. Backfill from the curated city's Hebrew name when we have a key.
    let resolvedPlaceName: string | undefined = placeNameStr || undefined;
    if (!resolvedPlaceName && resolvedKey) {
      resolvedPlaceName = findCityByKey(resolvedKey)?.nameHe;
      if (resolvedPlaceName) {
        StorageService.setPref('location_place_name', resolvedPlaceName);
      }
    }

    set({ latitude: lat, longitude: lng, cityHebcalKey: resolvedKey, placeName: resolvedPlaceName, source });
  },
}));
