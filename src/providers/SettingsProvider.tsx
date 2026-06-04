// src/providers/SettingsProvider.tsx
// Phase 3.7a-2 — removed 5 dead fields from v1:
//   showHebrew, showGregorian (v2 has separate tabs instead)
//   diagonalDirection (diagonal DayCell layout removed in v2)
//   rememberLastView, defaultViewMode (v2 has fixed tab navigation)
// Also removed: DiagonalDirection + ViewMode type exports, and the
// toggleHebrew / toggleGregorian / setDiagonalDirection actions.
//
// Kept:
//   hebrewOnTop + toggleHebrewOnTop (drives universal header — Phase 3.7c)
//   defaultCalendarType + setDefaultCalendarType (usage TBD in 3.7b/c)

import { create } from 'zustand';
import { StorageService } from '../services/StorageService';
import { NotificationService } from '../services/NotificationService';
import type { ZmanimMethod } from '../services/ZmanimService';
import { isIsraelCoords } from '../utils/isIsraelCoords';

// Re-export so existing consumers that import ZmanimMethod from SettingsProvider
// continue to work without changes.
export type { ZmanimMethod };
export type DefaultCalendarType = 'hebrew' | 'gregorian';
export type FirstDayOfWeek = 0 | 1; // 0=Sunday, 1=Monday

interface SettingsState {
  // Display
  hebrewOnTop: boolean;
  darkMode: 'system' | 'light' | 'dark';
  firstDayOfWeek: FirstDayOfWeek;

  // Calendar
  defaultCalendarType: DefaultCalendarType;
  diaspora: boolean;

  // Zmanim
  zmanimMethod: ZmanimMethod;
  use24hTime: boolean;

  // Omer reminders
  omerRemindersEnabled: boolean;
  omerReminderTime: string;

  // Candle-lighting reminders
  candleLightingRemindersEnabled: boolean;
  candleLightingLeadMinutes: number;
  candleLightingCity: string | null;
  candleLightingLat: number | null;
  candleLightingLng: number | null;
  candleLightingPlaceName: string | null;

  // Ready gate — false until loadFromStorage() completes
  settingsReady: boolean;

  // Actions
  toggleHebrewOnTop: () => void;
  setDarkMode: (m: 'system' | 'light' | 'dark') => void;
  setZmanimMethod: (m: ZmanimMethod) => void;
  setFirstDayOfWeek: (d: FirstDayOfWeek) => void;
  setDefaultCalendarType: (t: DefaultCalendarType) => void;
  setDiaspora: (v: boolean) => void;
  setOmerRemindersEnabled: (v: boolean) => void;
  setOmerReminderTime: (t: string) => void;
  setCandleLightingRemindersEnabled: (v: boolean) => void;
  setCandleLightingLeadMinutes: (m: number) => void;
  setCandleLightingCity: (c: string | null) => void;
  setCandleLightingLocation: (lat: number, lng: number, placeName: string) => void;
  loadFromStorage: () => Promise<void>;
  save: (key: string, value: string) => Promise<void>;
}

/**
 * Builds the coordinate override for ensureCandleLightingReminders from the
 * current GPS settings, or undefined when no GPS location is stored. Without
 * this, a GPS-only user (candleLightingCity === null) who toggles the reminder
 * or changes lead-minutes would re-enter the city-key path with a null city —
 * cancelling their reminders and rescheduling nothing.
 */
function buildCandleOverride(
  s: Pick<SettingsState, 'candleLightingLat' | 'candleLightingLng' | 'candleLightingPlaceName'>,
): { lat: number; lng: number; placeName: string; il: boolean } | undefined {
  if (s.candleLightingLat == null || s.candleLightingLng == null) return undefined;
  return {
    lat: s.candleLightingLat,
    lng: s.candleLightingLng,
    placeName: s.candleLightingPlaceName ?? '',
    il: isIsraelCoords(s.candleLightingLat, s.candleLightingLng),
  };
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  hebrewOnTop: true,
  darkMode: 'system',
  settingsReady: false,
  firstDayOfWeek: 0,
  defaultCalendarType: 'hebrew',
  diaspora: false,
  zmanimMethod: 'GRA',
  use24hTime: true,
  omerRemindersEnabled: false,
  omerReminderTime: '21:00',
  candleLightingRemindersEnabled: false,
  candleLightingLeadMinutes: 15,
  candleLightingCity: null,
  candleLightingLat: null,
  candleLightingLng: null,
  candleLightingPlaceName: null,

  toggleHebrewOnTop: () => { const v = !get().hebrewOnTop; set({ hebrewOnTop: v }); get().save('hebrewOnTop', String(v)); },
  setDarkMode:          (m) => { set({ darkMode: m });          get().save('darkMode', m); },
  setZmanimMethod:      (m) => { set({ zmanimMethod: m });      get().save('zmanimMethod', m); },
  setFirstDayOfWeek:    (d) => { set({ firstDayOfWeek: d });    get().save('firstDayOfWeek', String(d)); },
  setDefaultCalendarType: (t) => { set({ defaultCalendarType: t }); get().save('defaultCalendarType', t); },
  setDiaspora:          (v) => { set({ diaspora: v });           get().save('diaspora', String(v)); },
  setOmerRemindersEnabled: (v) => {
    set({ omerRemindersEnabled: v });
    get().save('omerRemindersEnabled', String(v));
    void NotificationService.ensureOmerReminders(v, get().omerReminderTime);
  },
  setOmerReminderTime: (t) => {
    set({ omerReminderTime: t });
    get().save('omerReminderTime', t);
    void NotificationService.ensureOmerReminders(get().omerRemindersEnabled, t);
  },
  setCandleLightingRemindersEnabled: (v) => {
    set({ candleLightingRemindersEnabled: v });
    get().save('candleLightingRemindersEnabled', String(v));
    const { candleLightingLeadMinutes, candleLightingCity } = get();
    void NotificationService.ensureCandleLightingReminders(
      v,
      candleLightingLeadMinutes,
      candleLightingCity,
      buildCandleOverride(get()),
    );
  },
  setCandleLightingLeadMinutes: (m) => {
    set({ candleLightingLeadMinutes: m });
    get().save('candleLightingLeadMinutes', String(m));
    const { candleLightingRemindersEnabled, candleLightingCity } = get();
    void NotificationService.ensureCandleLightingReminders(
      candleLightingRemindersEnabled,
      m,
      candleLightingCity,
      buildCandleOverride(get()),
    );
  },
  setCandleLightingCity: (c) => {
    set({ candleLightingCity: c, candleLightingLat: null, candleLightingLng: null, candleLightingPlaceName: null });
    get().save('candleLightingCity', c ?? '');
    get().save('candleLightingLat', '');
    get().save('candleLightingLng', '');
    get().save('candleLightingPlaceName', '');
    const { candleLightingRemindersEnabled, candleLightingLeadMinutes } = get();
    void NotificationService.ensureCandleLightingReminders(candleLightingRemindersEnabled, candleLightingLeadMinutes, c, undefined);
  },
  setCandleLightingLocation: (lat, lng, placeName) => {
    set({ candleLightingLat: lat, candleLightingLng: lng, candleLightingPlaceName: placeName });
    get().save('candleLightingLat', String(lat));
    get().save('candleLightingLng', String(lng));
    get().save('candleLightingPlaceName', placeName);
    const { candleLightingRemindersEnabled, candleLightingLeadMinutes, candleLightingCity } = get();
    void NotificationService.ensureCandleLightingReminders(
      candleLightingRemindersEnabled,
      candleLightingLeadMinutes,
      candleLightingCity,
      { lat, lng, placeName, il: isIsraelCoords(lat, lng) },
    );
  },

  loadFromStorage: async () => {
    try {
      // Single batched read (one transaction). Replaces the prior Promise.all
      // of 12 getPref() calls, which deadlocked expo-sqlite/legacy on Android.
      const p = await StorageService.getAllPrefs();
      const zmanim = p.zmanimMethod;
      set({
        hebrewOnTop:         (p.hebrewOnTop ?? 'true') === 'true',
        darkMode:            (p.darkMode ?? 'system') as 'system' | 'light' | 'dark',
        firstDayOfWeek:      Number(p.firstDayOfWeek ?? '0') as FirstDayOfWeek,
        defaultCalendarType: (p.defaultCalendarType ?? 'hebrew') as DefaultCalendarType,
        diaspora:            (p.diaspora ?? 'false') === 'true',
        // Migrate stored 'RABBANUT' (removed in Phase 4.1) to 'GRA'.
        // Also guards against any other unexpected stored value.
        zmanimMethod:
          zmanim === 'GRA' || zmanim === 'MGA' ? (zmanim as ZmanimMethod) : 'GRA',
        use24hTime:          (p.use24hTime ?? 'true') === 'true',
        omerRemindersEnabled: (p.omerRemindersEnabled ?? 'false') === 'true',
        omerReminderTime:    p.omerReminderTime ?? '21:00',
        candleLightingRemindersEnabled: (p.candleLightingRemindersEnabled ?? 'false') === 'true',
        candleLightingLeadMinutes: parseInt(p.candleLightingLeadMinutes ?? '15', 10) || 15,
        candleLightingCity:  p.candleLightingCity || null,
        candleLightingLat:   p.candleLightingLat ? parseFloat(p.candleLightingLat) : null,
        candleLightingLng:   p.candleLightingLng ? parseFloat(p.candleLightingLng) : null,
        candleLightingPlaceName: p.candleLightingPlaceName || null,
      });
    } catch (e) {
      console.error('[SettingsProvider] loadFromStorage failed:', e);
    } finally {
      // Always release the UI gate, even if loading failed — otherwise the
      // app freezes on a blank white screen (settingsReady never flips).
      set({ settingsReady: true });
    }
  },

  save: (key, value) => StorageService.setPref(key, value),
}));
