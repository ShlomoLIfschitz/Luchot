// src/providers/LocationProvider.tsx
// Phase 4.5 — Extended with city name, location source, and persistence.
//
// State:
//   latitude, longitude   — passed to ZmanimService (unchanged contract)
//   cityHebcalKey?        — which curated city we're at (if known)
//   source                — 'gps' | 'manual' | 'default'
//
// Actions:
//   setLocationFromGps(lat, lng)   — GPS fix; tries city lookup; persists
//   setLocationFromCity(hebcalKey) — manual pick; pulls coords from Hebcal; persists
//   loadFromStorage()              — called once at startup; rehydrates persisted state
//
// Old setLocation(lat, lng) is intentionally removed. Callers that still
// use it (only settings.tsx GPS button, which is now replaced by the
// picker) no longer exist after Phase 4.5.
//
// Persistence uses the generic preferences table via StorageService.
// Keys: location_lat, location_lng, location_city, location_source.
// Migration for existing users (lat/lng saved but no city key):
//   lookupCityByCoords is called on startup to attempt backfill.

import '@hebcal/cities'; // side-effect: registers ~700 cities into Location
import { create } from 'zustand';
import { DEFAULT_LAT, DEFAULT_LNG } from '../constants/config';
import { StorageService } from '../services/StorageService';
import { findCityByKey } from '../constants/cities';
import {
  lookupCityByCoords,
  findNearestCity,
  getCityCoordinates,
} from '../utils/locationLookup';

export type LocationSource = 'gps' | 'manual' | 'default';

interface LocationState {
  latitude: number;
  longitude: number;
  cityHebcalKey?: string;      // @hebcal/core city key — undefined means "unknown"
  source: LocationSource;       // how we got these coords

  setLocationFromGps:  (lat: number, lng: number) => void;
  setLocationFromCity: (hebcalKey: string) => boolean;  // false if key unknown
  loadFromStorage:     () => Promise<void>;
}

export const useLocationStore = create<LocationState>((set) => ({
  latitude:      DEFAULT_LAT,
  longitude:     DEFAULT_LNG,
  cityHebcalKey: 'Jerusalem', // default city matches DEFAULT_LAT/LNG (Jerusalem)
  source:        'default',

  // ── GPS fix ──────────────────────────────────────────────────────────────
  setLocationFromGps: (lat, lng) => {
    const matched = lookupCityByCoords(lat, lng);
    const cityKey = matched?.hebcalKey;

    set({ latitude: lat, longitude: lng, cityHebcalKey: cityKey, source: 'gps' });

    // Persist — fire-and-forget; failures are non-critical
    StorageService.setPref('location_lat',    String(lat));
    StorageService.setPref('location_lng',    String(lng));
    StorageService.setPref('location_city',   cityKey ?? '');
    StorageService.setPref('location_source', 'gps');
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
      source:        'manual',
    });

    StorageService.setPref('location_lat',    String(coords.lat));
    StorageService.setPref('location_lng',    String(coords.lng));
    StorageService.setPref('location_city',   hebcalKey);
    StorageService.setPref('location_source', 'manual');

    return true;
  },

  // ── Startup rehydration ──────────────────────────────────────────────────
  loadFromStorage: async () => {
    const [latStr, lngStr, cityKey, sourceStr] = await Promise.all([
      StorageService.getPref('location_lat',    ''),
      StorageService.getPref('location_lng',    ''),
      StorageService.getPref('location_city',   ''),
      StorageService.getPref('location_source', 'default'),
    ]);

    // No persisted data → keep Jerusalem default, nothing to do
    if (!latStr || !lngStr) return;

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

    set({ latitude: lat, longitude: lng, cityHebcalKey: resolvedKey, source });
  },
}));
