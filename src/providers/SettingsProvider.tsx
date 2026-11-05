// src/providers/SettingsProvider.tsx
// Phase 3.7a-2 — removed 5 dead fields from v1:
//   showHebrew, showGregorian (v2 has separate tabs instead)
//   diagonalDirection (diagonal DayCell layout removed in v2)
//   rememberLastView, defaultViewMode (v2 has fixed tab navigation)
// Also removed: DiagonalDirection + ViewMode type exports, and the
// toggleHebrew / toggleGregorian / setDiagonalDirection actions.
//
// Wave 1B — location unification: candleLightingCity / candleLightingLat /
// candleLightingLng / candleLightingPlaceName and their setters
// (setCandleLightingCity, setCandleLightingLocation) are REMOVED. Location
// is now owned exclusively by LocationProvider (single source of truth —
// see LocationProvider.tsx). candleLightingRemindersEnabled and
// candleLightingLeadMinutes remain here — those are genuine notification
// preferences, not location.
//
// Kept:
//   hebrewOnTop + toggleHebrewOnTop (drives universal header — Phase 3.7c)
//   defaultCalendarType + setDefaultCalendarType (usage TBD in 3.7b/c)

import { create } from 'zustand';
import { StorageService } from '../services/StorageService';
import { NotificationService } from '../services/NotificationService';
import type { ZmanimMethod } from '../services/ZmanimService';
import { isIsraelCoords } from '../utils/isIsraelCoords';
import { useLocationStore } from './LocationProvider';

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

  // Candle-lighting reminders — notification prefs only; location comes
  // from LocationProvider (see buildCandleLoc below).
  candleLightingRemindersEnabled: boolean;
  candleLightingLeadMinutes: number;

  // Device calendar sync (Phase 3). Off by default; the calendar permission is
  // requested only when the user turns it on (settings.tsx). shown = device
  // calendars shown as a live overlay (null = never chosen: settings.tsx
  // preselects the Google calendars); write = the one Google calendar Luchot
  // writes its personal events to (null = none).
  syncEnabled: boolean;
  syncShownCalendarIds: string[] | null;
  syncWriteCalendarId: string | null;

  // Ready gate — false until loadFromStorage() completes
  settingsReady: boolean;

  // Actions
  toggleHebrewOnTop: () => void;
  setDarkMode: (m: 'system' | 'light' | 'dark') => void;
  setZmanimMethod: (m: ZmanimMethod) => void;
  setFirstDayOfWeek: (d: FirstDayOfWeek) => void;
  setDefaultCalendarType: (t: DefaultCalendarType) => void;
  setDiaspora: (v: boolean) => void;
  setUse24hTime: (v: boolean) => void;
  setOmerRemindersEnabled: (v: boolean) => void;
  setOmerReminderTime: (t: string) => void;
  setCandleLightingRemindersEnabled: (v: boolean) => void;
  setCandleLightingLeadMinutes: (m: number) => void;
  setSyncEnabled: (v: boolean) => void;
  setSyncShownCalendarIds: (ids: string[]) => void;
  setSyncWriteCalendarId: (id: string | null) => void;
  loadFromStorage: () => Promise<void>;
  save: (key: string, value: string) => Promise<void>;
}

/**
 * Builds the location payload for NotificationService.ensureCandleLightingReminders
 * from the unified LocationProvider store. LocationProvider always carries a
 * location (defaults to Jerusalem), so in practice this never returns null —
 * the null case is kept purely defensively (mirrors NotificationService's
 * own `loc === null` handling) and to make the type honest.
 */
function buildCandleLoc(): { lat: number; lng: number; il: boolean; placeName?: string } | null {
  const { latitude, longitude, placeName } = useLocationStore.getState();
  if (latitude == null || longitude == null) return null;
  return { lat: latitude, lng: longitude, il: isIsraelCoords(latitude, longitude), placeName };
}

/** syncShownCalendarIds pref: a JSON string[]; anything else = never chosen. */
function parseIdList(raw: string | undefined): string[] | null {
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : null;
  } catch {
    return null;
  }
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
  syncEnabled: false,
  syncShownCalendarIds: null,
  syncWriteCalendarId: null,

  toggleHebrewOnTop: () => { const v = !get().hebrewOnTop; set({ hebrewOnTop: v }); get().save('hebrewOnTop', String(v)); },
  setDarkMode:          (m) => { set({ darkMode: m });          get().save('darkMode', m); },
  setZmanimMethod:      (m) => { set({ zmanimMethod: m });      get().save('zmanimMethod', m); },
  setFirstDayOfWeek:    (d) => { set({ firstDayOfWeek: d });    get().save('firstDayOfWeek', String(d)); },
  setDefaultCalendarType: (t) => { set({ defaultCalendarType: t }); get().save('defaultCalendarType', t); },
  setDiaspora:          (v) => { set({ diaspora: v });           get().save('diaspora', String(v)); },
  setUse24hTime:        (v) => { set({ use24hTime: v });         get().save('use24hTime', String(v)); },
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
    void NotificationService.ensureCandleLightingReminders(
      v,
      get().candleLightingLeadMinutes,
      buildCandleLoc(),
    );
  },
  setCandleLightingLeadMinutes: (m) => {
    set({ candleLightingLeadMinutes: m });
    get().save('candleLightingLeadMinutes', String(m));
    void NotificationService.ensureCandleLightingReminders(
      get().candleLightingRemindersEnabled,
      m,
      buildCandleLoc(),
    );
  },

  setSyncEnabled: (v) => { set({ syncEnabled: v }); get().save('syncEnabled', String(v)); },
  setSyncShownCalendarIds: (ids) => {
    set({ syncShownCalendarIds: ids });
    get().save('syncShownCalendarIds', JSON.stringify(ids));
  },
  setSyncWriteCalendarId: (id) => {
    set({ syncWriteCalendarId: id });
    get().save('syncWriteCalendarId', id ?? '');
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
        syncEnabled:         (p.syncEnabled ?? 'false') === 'true',
        syncShownCalendarIds: parseIdList(p.syncShownCalendarIds),
        syncWriteCalendarId: p.syncWriteCalendarId ? p.syncWriteCalendarId : null,
        // candleLightingCity / candleLightingLat / candleLightingLng /
        // candleLightingPlaceName intentionally NOT read here anymore —
        // LocationProvider.loadFromStorage() adopts (migrates) any orphaned
        // values from those same pref keys into itself and clears them.
        // Reading them here too would resurrect fields that no longer exist
        // on this store and would race the migration.
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

// ── Location-change reschedule wiring ─────────────────────────────────────
// Candle-lighting reminders are location-dependent. LocationProvider must
// stay free of settings/notification knowledge — it must NOT import
// SettingsProvider or NotificationService (locked constraint; SettingsProvider
// already imports NotificationService, and now also imports LocationProvider
// to read the unified location, so the reverse import would create a cycle).
// So the "reschedule candle-lighting reminders when location changes" wiring
// lives here instead: a one-time module-load subscription to the location
// store. Runs at most once per actual lat/lng/placeName change; a no-op
// while candle-lighting reminders are disabled.
useLocationStore.subscribe((state, prevState) => {
  if (
    state.latitude === prevState.latitude &&
    state.longitude === prevState.longitude &&
    state.placeName === prevState.placeName
  ) {
    return;
  }
  const { candleLightingRemindersEnabled, candleLightingLeadMinutes } = useSettingsStore.getState();
  if (!candleLightingRemindersEnabled) return; // nothing scheduled to update
  void NotificationService.ensureCandleLightingReminders(
    true,
    candleLightingLeadMinutes,
    {
      lat: state.latitude,
      lng: state.longitude,
      il: isIsraelCoords(state.latitude, state.longitude),
      placeName: state.placeName,
    },
  );
});
